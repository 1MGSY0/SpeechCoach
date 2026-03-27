"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

type GradingResult = {
  _id: string;
  score?: number;
  maxScore?: number;
  count?: number;
  feedback?: string;
  evidence?: string[];
  turnRefs?: number[];
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
}

function getLetterGrade(score?: number | null) {
  if (score == null) return "—";
  if (score >= 9) return "A";
  if (score >= 7) return "B";
  if (score >= 5) return "C";
  if (score >= 3) return "D";
  return "F";
}

export const GradingBreakdownView = ({ data }: Props) => {
  if (!data) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No grading breakdown available.
      </div>
    );
  }

  const letter = getLetterGrade(data.overallScore);

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
              {data.overallScore ?? "—"}
              {data.overallScore != null ? <span className="text-base font-normal"> / 10</span> : null}
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
            <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
              {data.summary || "No summary available."}
            </p>

            {data.recommendations?.length ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Recommendations</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {data.recommendations.map((item, index) => (
                    <li key={`${item}-${index}`} className="text-sm text-muted-foreground">
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
            Criterion-level grading, evidence, and turn references
          </CardDescription>
        </CardHeader>
        <CardContent className={undefined}>
          <div className="overflow-x-auto rounded-lg border">
            <Table className={undefined}>
              <TableHeader className={undefined}>
                <TableRow className={undefined}>
                  <TableHead className={undefined}>Category</TableHead>
                  <TableHead className={undefined}>Criterion</TableHead>
                  <TableHead className="w-[90px]">Count</TableHead>
                  <TableHead className="w-[120px]">Score</TableHead>
                  <TableHead className={undefined}>Feedback</TableHead>
                  <TableHead className={undefined}>Evidence</TableHead>
                  <TableHead className={undefined}>Turns</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={undefined}>
                {data.results.length ? (
                  data.results.map((result) => (
                    <TableRow key={result._id} className={undefined}>
                      <TableCell className="font-medium">
                        {result.category?.name || "—"}
                      </TableCell>
                      <TableCell className={undefined}>{result.criterion?.name || "—"}</TableCell>
                      <TableCell className={undefined}>{result.count ?? "—"}</TableCell>
                      <TableCell className={undefined}>
                        {result.score != null ? `${result.score}${result.maxScore != null ? ` / ${result.maxScore}` : ""}` : "—"}
                      </TableCell>
                      <TableCell className="max-w-[320px] whitespace-pre-wrap text-sm text-muted-foreground">
                        {result.feedback || "—"}
                      </TableCell>
                      <TableCell className={undefined}>
                        <div className="flex flex-wrap gap-1">
                          {result.evidence?.length ? (
                            result.evidence.slice(0, 3).map((item, index) => (
                              <Badge key={`${item}-${index}`} variant="secondary" className="max-w-[220px] truncate">
                                {item}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={undefined}>
                        <div className="flex flex-wrap gap-1">
                          {result.turnRefs?.length ? (
                            result.turnRefs.map((turn) => (
                              <Badge key={turn} variant="outline" className={undefined}>
                                Turn {turn}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className={undefined}>
                    <TableCell colSpan={7} className="text-sm text-muted-foreground">
                      No grading rows available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};