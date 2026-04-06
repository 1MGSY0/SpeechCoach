"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { timestampToSeconds } from "./transcript-utils";

type GradingResult = {
  _id: string;
  score?: number;
  maxScore?: number;
  count?: number;
  feedback?: string;
  evidence?: string[];
  turnRefs?: Array<{ text: string; timestamp: string }>;
  category?: {
    _id: string;
    name: string;
  } | null;
  criterion?: {
    _id: string;
    name: string;
  } | null;
};

type GradingBreakdownData = {
  overallScore?: number | null;
  summary?: string | null;
  recommendations?: string[] | null;
  framework?: {
    name: string;
    description?: string | null;
  } | null;
  results: GradingResult[];
};

interface Props {
  data: GradingBreakdownData | null;
  onTimestampClick?: (seconds: number, timestamp: string) => void;
}

function getLetterGrade(score?: number | null) {
  if (score == null) return "-";
  if (score >= 9) return "A";
  if (score >= 7) return "B";
  if (score >= 5) return "C";
  if (score >= 3) return "D";
  return "F";
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

export const GradingBreakdownView = ({ data, onTimestampClick }: Props) => {
  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No grading breakdown available.
      </div>
    );
  }

  const letter = getLetterGrade(data.overallScore);
  const groupedResults = groupResultsByCategory(data.results);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="border-2">
          <CardHeader className={undefined}>
            <CardDescription className={undefined}>Overall Grade</CardDescription>
            <CardTitle className="text-7xl font-extrabold tracking-tight">
              {letter}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold">
              {data.overallScore ?? "-"}
              {data.overallScore != null ? (
                <span className="text-base font-normal"> / 10</span>
              ) : null}
            </div>
            {data.framework?.name ? (
              <p className="text-sm text-muted-foreground">{data.framework.name}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className={undefined}>
          <CardHeader className={undefined}>
            <CardTitle className={undefined}>Assessment Summary</CardTitle>
            <CardDescription className={undefined}>
              Rubric-based evaluation of the completed conversation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {data.summary || "No summary available."}
            </p>

            {data.recommendations?.length ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Recommendations</h4>
                <ul className="list-disc space-y-1 pl-5">
                  {data.recommendations.map((item, index) => (
                    <li
                      key={`${item}-${index}`}
                      className="text-sm text-muted-foreground"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className={undefined}>
        <CardHeader className={undefined}>
          <CardTitle className={undefined}>Detailed Breakdown</CardTitle>
          <CardDescription className={undefined}>
            Criterion-level grading, evidence, and counts grouped by category
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedResults.length ? (
            groupedResults.map((group) => (
              <div key={group.title} className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>

                <div className="overflow-x-auto rounded-lg border">
                  <Table className={undefined}>
                    <TableHeader className={undefined}>
                      <TableRow className="border-b bg-primary/20 hover:bg-primary/20">
                        <TableHead className="font-bold text-foreground">
                          Criterion
                        </TableHead>
                        <TableHead className="w-[8ch] max-w-[8ch] text-center font-bold text-foreground">
                          Score
                        </TableHead>
                        <TableHead className="font-bold text-foreground">
                          Feedback
                        </TableHead>
                        <TableHead className="font-bold text-foreground">
                          Evidence
                        </TableHead>
                        <TableHead className="w-[5ch] min-w-[5ch] text-center font-bold text-foreground">
                          Count
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className={undefined}>
                      {group.results.map((result) => (
                        <TableRow key={result._id} className="hover:bg-primary/5">
                          <TableCell className="font-medium">
                            {result.criterion?.name || "-"}
                          </TableCell>
                          <TableCell className="w-[8ch] max-w-[8ch] text-center whitespace-nowrap font-medium tabular-nums">
                            {result.score != null
                              ? `${result.score}${
                                  result.maxScore != null ? ` / ${result.maxScore}` : ""
                                }`
                              : "-"}
                          </TableCell>
                          <TableCell className="max-w-[320px] whitespace-pre-wrap text-sm text-muted-foreground">
                            {result.feedback || "-"}
                          </TableCell>
                          <TableCell className={undefined}>
                            <div className="flex flex-wrap gap-1">
                              {result.evidence?.length ? (
                                result.evidence.slice(0, 3).map((item, index) => (
                                  <Button
                                    key={`${item}-${index}`}
                                    type="button"
                                    variant="ghost"
                                    size="xs"
                                    className="inline-flex h-auto rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/30"
                                    onClick={() =>
                                      onTimestampClick?.(timestampToSeconds(item), item)
                                    }
                                  >
                                    {item}
                                  </Button>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-[5ch] min-w-[5ch] text-center whitespace-nowrap font-medium tabular-nums">
                            {result.count ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">
              No grading rows available.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
