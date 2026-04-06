"use client";

import { parseSemanticMemory } from "@/lib/semantic-memory";
import { parseTranscriptJson } from "./states/transcript-utils";

type TurnRef = {
  text: string;
  timestamp: string;
};

type GradingResult = {
  _id: string;
  score?: number;
  maxScore?: number;
  count?: number;
  feedback?: string;
  evidence?: string[];
  turnRefs?: TurnRef[];
  category?: { _id: string; name: string } | null;
  criterion?: { _id: string; name: string } | null;
};

type GradingData = {
  overallScore?: number | null;
  summary?: string | null;
  recommendations?: string[] | null;
  framework?: {
    name: string;
    description?: string | null;
  } | null;
  results: GradingResult[];
} | null;

type ExportConversationReportInput = {
  conversationName: string;
  summary?: string | null;
  transcript?: string | null;
  gradingData?: GradingData;
};

type ParsedSection = {
  title: string;
  content: string[];
};

type NoteRow = {
  timestamp: string;
  bullets: string[];
};

function sanitizeFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseSummary(summary?: string | null): ParsedSection[] {
  if (!summary?.trim()) return [];

  const memory = parseSemanticMemory(summary);
  if (memory) {
    const sections: ParsedSection[] = [];

    if (memory.rollingSummary) {
      sections.push({
        title: "Overview",
        content: [memory.rollingSummary],
      });
    }

    if (memory.progressionReason.length) {
      sections.push({
        title: "Notes",
        content: memory.progressionReason.map(
          (item) => `- **[${item.timestamp}]** ${item.progressionLog}`
        ),
      });
    }

    return sections;
  }

  return [
    {
      title: "Overview",
      content: [summary],
    },
  ];
}

function parseNotesRows(lines: string[]): NoteRow[] {
  const rows: NoteRow[] = [];
  let currentRow: NoteRow | null = null;

  for (const line of lines) {
    const timestampMatch = line.match(/^-\s+\*\*\[(.+?)\]\*\*\s*(.*)$/);
    const bulletMatch = line.match(/^-\s+(.*)$/);

    if (timestampMatch) {
      const noteText = timestampMatch[2]?.replace(/^-\s*/, "").trim();
      currentRow = {
        timestamp: timestampMatch[1],
        bullets: noteText ? [noteText] : [],
      };
      rows.push(currentRow);
      continue;
    }

    if (bulletMatch && currentRow) {
      currentRow.bullets.push(bulletMatch[1]);
      continue;
    }

    if (currentRow) {
      currentRow.bullets.push(line);
    }
  }

  return rows;
}

function renderNotesTableHtml(lines: string[]) {
  const rows = parseNotesRows(lines);

  if (!rows.length) {
    return `<p class="muted">No notes available.</p>`;
  }

  return `
    <table class="report-table notes-table">
      <thead>
        <tr>
          <th class="notes-time-col">Timestamp</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td class="notes-time-col">${escapeHtml(row.timestamp)}</td>
                <td>
                  ${
                    row.bullets.length
                      ? `<ul class="notes-list">
                           ${row.bullets
                             .map((item) => `<li>${escapeHtml(item)}</li>`)
                             .join("")}
                         </ul>`
                      : `<span class="muted">-</span>`
                  }
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderSummaryHtml(summary?: string | null) {
  const sections = parseSummary(summary);

  if (!sections.length) {
    return `<p class="muted">No summary available.</p>`;
  }

  return sections
    .map((section) => {
      if (section.title.toLowerCase() === "notes") {
        return `
          <section class="summary-section">
            <h3>${escapeHtml(section.title)}</h3>
            <div class="summary-content">${renderNotesTableHtml(section.content)}</div>
          </section>
        `;
      }

      const items = section.content
        .map((line) => {
          const bulletMatch = line.match(/^-\s+(.*)$/);
          if (bulletMatch) {
            return `<li>${escapeHtml(bulletMatch[1])}</li>`;
          }

          return `<p>${escapeHtml(line)}</p>`;
        })
        .join("");

      return `
        <section class="summary-section">
          <h3>${escapeHtml(section.title)}</h3>
          <div class="summary-content">${items}</div>
        </section>
      `;
    })
    .join("");
}

function groupResultsByCategory(results: GradingResult[]) {
  const grouped = new Map<string, { title: string; results: GradingResult[] }>();

  for (const result of results) {
    const categoryId = result.category?._id ?? "uncategorized";
    const categoryName = result.category?.name ?? "Uncategorized";
    const existing = grouped.get(categoryId);

    if (existing) {
      existing.results.push(result);
      continue;
    }

    grouped.set(categoryId, {
      title: categoryName,
      results: [result],
    });
  }

  return Array.from(grouped.values());
}

function renderGradingHtml(gradingData?: GradingData) {
  if (!gradingData) {
    return `<p class="muted">No grading breakdown available.</p>`;
  }

  const groupedResults = groupResultsByCategory(gradingData.results ?? []);

  return `
    <div class="grade-overview">
      <div class="grade-card">
        <div class="eyebrow">Overall Grade</div>
        <div class="grade-letter">${escapeHtml(
          gradingData.overallScore == null
            ? "-"
            : gradingData.overallScore >= 9
              ? "A"
              : gradingData.overallScore >= 7
                ? "B"
                : gradingData.overallScore >= 5
                  ? "C"
                  : gradingData.overallScore >= 3
                    ? "D"
                    : "F"
        )}</div>
        <div class="grade-score">${escapeHtml(
          gradingData.overallScore == null
            ? "-"
            : `${gradingData.overallScore} / 10`
        )}</div>
        ${
          gradingData.framework?.name
            ? `<div class="muted">${escapeHtml(gradingData.framework.name)}</div>`
            : ""
        }
      </div>
      <div class="summary-card">
        <div class="section-title">Assessment Summary</div>
        <p>${escapeHtml(gradingData.summary || "No summary available.")}</p>
        ${
          gradingData.recommendations?.length
            ? `
              <div class="subsection-title">Recommendations</div>
              <ul class="recommendations">
                ${gradingData.recommendations
                  .map((item) => `<li>${escapeHtml(item)}</li>`)
                  .join("")}
              </ul>
            `
            : ""
        }
      </div>
    </div>
    ${
      groupedResults.length
        ? groupedResults
            .map(
              (group) => `
                <div class="grading-group">
                  <h3>${escapeHtml(group.title)}</h3>
                  <table class="report-table">
                    <thead>
                      <tr>
                        <th>Criterion</th>
                        <th class="center">Score</th>
                        <th>Feedback</th>
                        <th>Evidence</th>
                        <th class="center">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${group.results
                        .map(
                          (result) => `
                            <tr>
                              <td>${escapeHtml(result.criterion?.name || "-")}</td>
                              <td class="center">${escapeHtml(
                                result.score != null
                                  ? `${result.score}${
                                      result.maxScore != null ? ` / ${result.maxScore}` : ""
                                    }`
                                  : "-"
                              )}</td>
                              <td>${escapeHtml(result.feedback || "-")}</td>
                              <td>${escapeHtml((result.evidence ?? []).join(", ") || "-")}</td>
                              <td class="center">${escapeHtml(
                                result.count != null ? String(result.count) : "-"
                              )}</td>
                            </tr>
                          `
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
            )
            .join("")
        : `<p class="muted">No grading rows available.</p>`
    }
  `;
}

function renderTranscriptHtml(transcript?: string | null) {
  const turns = parseTranscriptJson(transcript);

  if (!turns.length) {
    return `<p class="muted">No transcript available.</p>`;
  }

  return `
    <table class="report-table transcript-table">
      <thead>
        <tr>
          <th class="timestamp-col">Timestamp</th>
          <th class="speaker-col">Speaker</th>
          <th>Text</th>
        </tr>
      </thead>
      <tbody>
        ${turns
          .map(
            (turn) => `
              <tr>
                <td class="timestamp-col">${escapeHtml(turn.timestamp)}</td>
                <td class="speaker-col">${escapeHtml(turn.speaker)}</td>
                <td>${escapeHtml(turn.text)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function buildReportHtml({
  conversationName,
  summary,
  transcript,
  gradingData,
}: ExportConversationReportInput) {
  const safeConversationName = sanitizeFileName(conversationName || "conversation-report");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(safeConversationName)}</title>
        <style>
          :root {
            color-scheme: light;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #111827;
            background: #f8fafc;
          }

          .page {
            min-height: 100vh;
            padding: 32px;
            background: #ffffff;
            page-break-after: always;
            break-after: page;
          }

          .page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .page-header {
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e5e7eb;
          }

          .eyebrow {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #6b7280;
          }

          h1 {
            margin: 8px 0 0;
            font-size: 28px;
            line-height: 1.2;
          }

          h2 {
            margin: 0;
            font-size: 22px;
            line-height: 1.2;
          }

          h3 {
            margin: 0 0 12px;
            font-size: 16px;
            line-height: 1.3;
          }

          p, li, td, th, div {
            line-height: 1.5;
          }

          .muted {
            color: #6b7280;
          }

          .summary-section {
            margin-bottom: 20px;
            padding: 18px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #ffffff;
          }

          .summary-content p,
          .summary-content li {
            margin: 8px 0;
            font-size: 14px;
          }

          .notes-table .notes-time-col {
            width: 180px;
            white-space: nowrap;
          }

          .notes-list {
            margin: 0;
            padding-left: 18px;
          }

          .notes-list li {
            margin: 6px 0;
          }

          .grade-overview {
            display: grid;
            grid-template-columns: 240px 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }

          .grade-card,
          .summary-card {
            padding: 18px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #ffffff;
          }

          .grade-letter {
            margin-top: 8px;
            font-size: 64px;
            font-weight: 800;
            line-height: 1;
          }

          .grade-score {
            margin-top: 8px;
            font-size: 24px;
            font-weight: 600;
          }

          .section-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 12px;
          }

          .subsection-title {
            margin-top: 16px;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 700;
          }

          .recommendations {
            margin: 0;
            padding-left: 18px;
          }

          .grading-group {
            margin-bottom: 20px;
          }

          .report-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
          }

          .report-table th,
          .report-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            font-size: 13px;
            text-align: left;
          }

          .report-table thead th {
            font-weight: 700;
            background: rgba(59, 130, 246, 0.2);
          }

          .report-table tr:last-child td {
            border-bottom: none;
          }

          .center {
            text-align: center !important;
            white-space: nowrap;
          }

          .timestamp-col {
            width: 110px;
            white-space: nowrap;
          }

          .speaker-col {
            width: 90px;
            white-space: nowrap;
          }

          @media print {
            body {
              background: #ffffff;
            }

            .page {
              min-height: auto;
              padding: 20mm 16mm;
            }
          }
        </style>
      </head>
      <body>
        <section class="page">
          <div class="page-header">
            <div class="eyebrow">Conversation Report</div>
            <h1>${escapeHtml(conversationName)}</h1>
          </div>
          <h2>Summary</h2>
          ${renderSummaryHtml(summary)}
        </section>

        <section class="page">
          <div class="page-header">
            <div class="eyebrow">Conversation Report</div>
            <h1>${escapeHtml(conversationName)}</h1>
          </div>
          <h2>Grading</h2>
          ${renderGradingHtml(gradingData)}
        </section>

        <section class="page">
          <div class="page-header">
            <div class="eyebrow">Conversation Report</div>
            <h1>${escapeHtml(conversationName)}</h1>
          </div>
          <h2>Transcript</h2>
          ${renderTranscriptHtml(transcript)}
        </section>
      </body>
    </html>
  `;
}

export function exportConversationReportAsPdf(input: ExportConversationReportInput) {
  const safeFileName = sanitizeFileName(input.conversationName || "conversation-report");
  const html = buildReportHtml(input);
  const iframe = document.createElement("iframe");

  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const iframeWindow = iframe.contentWindow;

  if (!iframeWindow) {
    document.body.removeChild(iframe);
    throw new Error("Unable to prepare export document.");
  }

  iframeWindow.document.open();
  iframeWindow.document.write(html);
  iframeWindow.document.close();
  iframeWindow.document.title = safeFileName;

  iframe.onload = () => {
    iframeWindow.focus();
    iframeWindow.print();

    window.setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1000);
  };
}
