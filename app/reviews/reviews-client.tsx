"use client";

import { useState } from "react";
import { createExperiment, updateExperimentStatus } from "@/app/actions/experiments";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { upsertWeeklyReview } from "@/app/actions/reviews";
import { getWeekStart } from "@/lib/utils";
import { ChevronDown, ChevronUp, Star, TrendingUp, Clock, Moon, CheckSquare } from "lucide-react";
import type { WeeklyAnalysisApiResponse, WeeklyAnalysisResponse } from "@/lib/ai";
import type {
  BehaviorPattern,
  CoachingRecommendation,
  ExperimentSummary,
} from "@/lib/coaching";
import type { LifeSummary } from "@/lib/life-summary";
import {
  formatMetricTargetLabel,
  formatTargetStatusLabel,
  formatTrendLabel,
} from "@/lib/metric-utils";

interface WeeklyReview {
  id: string;
  weekStart: Date;
  wins: string | null;
  challenges: string | null;
  improvements: string | null;
  focusNextWeek: string | null;
  rating: number | null;
}

interface WeeklyStats {
  habitCompletionRate: number;
  totalDeepWork: number;
  avgSleep: number;
  tasksCompleted: number;
}

interface Props {
  current: WeeklyReview | null;
  allReviews: WeeklyReview[];
  weeklyStats: WeeklyStats;
  initialSummary: LifeSummary;
  initialPatterns: BehaviorPattern[];
  initialRecommendations: CoachingRecommendation[];
  initialActiveExperiment: ExperimentSummary | null;
  initialExperimentHistory: ExperimentSummary[];
}

async function fetchWeeklyAnalysis(): Promise<WeeklyAnalysisApiResponse> {
  const response = await fetch("/api/ai/weekly-analysis", {
    method: "GET",
    cache: "no-store",
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to load AI insights.");
  }

  return payload as WeeklyAnalysisApiResponse;
}

function formatMetricValue(value: number | null) {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function getAreaStatusVariant(status: "strong" | "mixed" | "strained") {
  switch (status) {
    case "strong":
      return "secondary" as const;
    case "strained":
      return "destructive" as const;
    case "mixed":
    default:
      return "outline" as const;
  }
}

export function ReviewsClient({
  current,
  allReviews,
  weeklyStats,
  initialSummary,
  initialPatterns,
  initialRecommendations,
  initialActiveExperiment,
  initialExperimentHistory,
}: Props) {
  const [wins, setWins] = useState(current?.wins ?? "");
  const [challenges, setChallenges] = useState(current?.challenges ?? "");
  const [improvements, setImprovements] = useState(current?.improvements ?? "");
  const [focus, setFocus] = useState(current?.focusNextWeek ?? "");
  const [rating, setRating] = useState<number>(current?.rating ?? 0);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<WeeklyAnalysisResponse | null>(null);
  const [analysisFallback, setAnalysisFallback] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [summary, setSummary] = useState(initialSummary);
  const [patterns, setPatterns] = useState(initialPatterns);
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [activeExperiment, setActiveExperiment] = useState(initialActiveExperiment);
  const [experimentHistory, setExperimentHistory] = useState(initialExperimentHistory);
  const [experimentSaving, setExperimentSaving] = useState(false);
  const [experimentOutcome, setExperimentOutcome] = useState("");
  const [effectivenessScore, setEffectivenessScore] = useState<string>("7");
  const [experimentError, setExperimentError] = useState<string | null>(null);

  const weekStart = getWeekStart();
  const weekLabel = weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  async function handleSave() {
    setSaving(true);
    await upsertWeeklyReview({ wins, challenges, improvements, focusNextWeek: focus, rating });
    setSaving(false);
  }

  const past = allReviews.filter(
    (r) => new Date(r.weekStart).getTime() !== weekStart.getTime()
  );

  async function loadAnalysis() {
    setAnalysisLoading(true);
    setAnalysisFallback(null);

    try {
      const data = await fetchWeeklyAnalysis();
      setAnalysis(data.analysis);
      setSummary(data.summary);
      setPatterns(data.patterns ?? []);
      setRecommendations(data.recommendations ?? []);
      setActiveExperiment(data.activeExperiment ?? null);
      setExperimentHistory(data.recentExperimentOutcomes ?? []);
      setAnalysisFallback(data.fallback ?? null);
    } catch (error) {
      setAnalysis({
        insights: [],
        problems: [],
        recommendations: [],
        priorities: [],
      });
      setAnalysisFallback(
        error instanceof Error ? error.message : "Failed to load AI insights."
      );
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleStartExperiment(recommendation: CoachingRecommendation) {
    setExperimentSaving(true);
    setExperimentError(null);

    try {
      const created = await createExperiment({
        title: recommendation.experimentTitle,
        hypothesis: recommendation.hypothesis,
        targetMetricId: recommendation.targetMetricId,
        relatedPatternKey: recommendation.patternKey,
        actions: recommendation.actions,
        successCriteria: recommendation.successCriteria,
      });
      setActiveExperiment(created);
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "Failed to start experiment."
      );
    } finally {
      setExperimentSaving(false);
    }
  }

  async function handleUpdateExperiment(status: "COMPLETED" | "ABANDONED") {
    if (!activeExperiment) return;

    setExperimentSaving(true);
    setExperimentError(null);

    try {
      const updated = await updateExperimentStatus(
        activeExperiment.id,
        status,
        experimentOutcome,
        effectivenessScore ? Number(effectivenessScore) : undefined
      );

      setActiveExperiment(null);
      setExperimentHistory((currentHistory) => [updated, ...currentHistory].slice(0, 3));
      setExperimentOutcome("");
      setEffectivenessScore("7");
    } catch (error) {
      setExperimentError(
        error instanceof Error ? error.message : "Failed to update experiment."
      );
    } finally {
      setExperimentSaving(false);
    }
  }

  const stats = [
    { icon: TrendingUp, label: "Habit Rate", value: `${weeklyStats.habitCompletionRate}%`, color: "text-green-500" },
    { icon: Clock, label: "Deep Work", value: `${weeklyStats.totalDeepWork}h`, color: "text-blue-500" },
    { icon: Moon, label: "Avg Sleep", value: `${weeklyStats.avgSleep}h`, color: "text-indigo-400" },
    { icon: CheckSquare, label: "Tasks Done", value: String(weeklyStats.tasksCompleted), color: "text-orange-500" },
  ];

  const analysisSections: Array<{
    key: keyof WeeklyAnalysisResponse;
    title: string;
  }> = [
    { key: "insights", title: "Insights" },
    { key: "problems", title: "Problems" },
    { key: "recommendations", title: "Recommendations" },
    { key: "priorities", title: "Top Priorities" },
  ];

  return (
    <div>
      <PageHeader title="Weekly Review" description={`Week of ${weekLabel}`} />

      <div className="px-4 space-y-4">
        {/* Weekly Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-base font-semibold">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base">Area Scorecards</CardTitle>
              <CardDescription>
                Strategic rollups showing where life feels strong, mixed, or strained this week.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.lifeAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No life areas yet. Create one to start seeing strategic rollups.
              </p>
            ) : (
              summary.lifeAreas.map((area) => (
                <div key={area.id} className="rounded-lg border bg-muted/30 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: area.color }} />
                        <p className="text-sm font-medium">{area.name}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {area.execution.tasksCompleted} tasks done, {area.execution.habitCompletionRate}% habit completion, {area.signals.improvingMetricCount}/{area.signals.strategicMetricCount} improving metrics
                      </p>
                      {area.topRisks.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {area.topRisks.map((risk) => (
                            <Badge key={risk.key} variant="outline">
                              {risk.label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant={getAreaStatusVariant(area.status)}>{area.status}</Badge>
                      <Badge variant="outline">{area.linkedCounts.overdueTasks} overdue</Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base">Execution Layer</CardTitle>
              <CardDescription>
                Milestones and computed progress highlighting where execution is slipping.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/40 px-3 py-3">
              <p className="text-xs text-muted-foreground">Stalled Projects</p>
              <p className="text-lg font-semibold">{summary.execution.stalledProjectCount}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-3">
              <p className="text-xs text-muted-foreground">Goals At Risk</p>
              <p className="text-lg font-semibold">{summary.execution.goalsAtRiskCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base">Strategic Metrics</CardTitle>
              <CardDescription>
                Opted-in metrics that now influence weekly insights and daily planning.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.strategicMetrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No metrics are included in AI & reviews yet. Enable that on a metric to surface it here.
              </p>
            ) : (
              summary.strategicMetrics.map((metric) => (
                <div key={metric.id} className="rounded-lg border bg-muted/30 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{metric.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMetricValue(metric.latestValue)} {metric.unit}
                      </p>
                      {formatMetricTargetLabel(metric.targetValue, metric.unit, metric.direction) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatMetricTargetLabel(metric.targetValue, metric.unit, metric.direction)}
                        </p>
                      )}
                      {metric.lifeAreaName && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Area: {metric.lifeAreaName}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Role: {metric.signalRole.toLowerCase()}
                      </p>
                      {metric.goalTitle && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Goal: {metric.goalTitle}
                        </p>
                      )}
                      {metric.projectName && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Project: {metric.projectName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge variant="outline">{formatTrendLabel(metric.trend)}</Badge>
                      <Badge variant={metric.targetStatus === "above" ? "destructive" : metric.targetStatus === "at" ? "secondary" : "outline"}>
                        {formatTargetStatusLabel(metric.targetStatus)}
                      </Badge>
                      <Badge variant={metric.improving ? "secondary" : "outline"}>
                        {metric.improving ? "Improving" : "Not improving"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base">Patterns</CardTitle>
              <CardDescription>
                Deterministic patterns detected before the AI layer synthesizes the weekly story.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {patterns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No strong coaching patterns have been detected yet.
              </p>
            ) : (
              patterns.map((pattern) => {
                const recommendation = recommendations.find(
                  (item) => item.patternKey === pattern.key
                );

                return (
                  <div key={pattern.key} className="rounded-lg border bg-muted/30 px-3 py-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{pattern.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{pattern.evidenceSummary}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Signals: {pattern.involvedSignals.join(", ")}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Badge variant="outline">{pattern.type}</Badge>
                        <Badge variant="secondary">{Math.round(pattern.confidence * 100)}% confidence</Badge>
                      </div>
                    </div>

                    {recommendation && (
                      <div className="rounded-md border border-dashed px-3 py-3 space-y-2">
                        <p className="text-sm font-medium">{recommendation.title}</p>
                        <p className="text-sm text-muted-foreground">{recommendation.whyItHelps}</p>
                        <ul className="space-y-1">
                          {recommendation.actions.map((action) => (
                            <li key={action.title} className="text-sm text-muted-foreground">
                              • {action.title}
                            </li>
                          ))}
                        </ul>
                        {recommendation.suggestion === "start" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleStartExperiment(recommendation)}
                            disabled={experimentSaving || activeExperiment !== null}
                          >
                            {experimentSaving ? "Starting..." : activeExperiment ? "Active experiment already running" : "Start experiment"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-base">Experiments</CardTitle>
              <CardDescription>
                Run one focused behavior experiment at a time and capture what actually works.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {experimentError && (
              <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                {experimentError}
              </div>
            )}

            {activeExperiment ? (
              <div className="rounded-lg border bg-muted/30 px-3 py-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{activeExperiment.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{activeExperiment.hypothesis}</p>
                    {activeExperiment.targetMetricName && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Tracking: {activeExperiment.targetMetricName}
                      </p>
                    )}
                    {activeExperiment.reviewDate && (
                      <p className="text-xs text-muted-foreground">
                        Review by {new Date(activeExperiment.reviewDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                  <Badge>Active</Badge>
                </div>

                <div className="space-y-1">
                  {activeExperiment.actions.map((action) => (
                    <p key={action.title} className="text-sm text-muted-foreground">
                      • {action.title}
                    </p>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="experiment-outcome">Outcome summary</Label>
                  <Textarea
                    id="experiment-outcome"
                    placeholder="What happened when you ran this experiment?"
                    value={experimentOutcome}
                    onChange={(event) => setExperimentOutcome(event.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="experiment-score">Effectiveness (1-10)</Label>
                  <Input
                    id="experiment-score"
                    type="number"
                    min={1}
                    max={10}
                    value={effectivenessScore}
                    onChange={(event) => setEffectivenessScore(event.target.value)}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleUpdateExperiment("COMPLETED")}
                    disabled={experimentSaving}
                  >
                    {experimentSaving ? "Saving..." : "Complete experiment"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleUpdateExperiment("ABANDONED")}
                    disabled={experimentSaving}
                  >
                    {experimentSaving ? "Saving..." : "Abandon experiment"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active experiment right now. Start one from a detected pattern above.
              </p>
            )}

            {experimentHistory.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Outcomes
                </p>
                {experimentHistory.map((experiment) => (
                  <div key={experiment.id} className="rounded-lg border bg-muted/20 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{experiment.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {experiment.outcomeSummary ?? "No outcome summary recorded yet."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={experiment.status === "COMPLETED" ? "secondary" : "outline"}>
                          {experiment.status.toLowerCase()}
                        </Badge>
                        {experiment.effectivenessScore !== null && (
                          <Badge variant="outline">{experiment.effectivenessScore}/10</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">AI Insights</CardTitle>
                <CardDescription>
                  Structured weekly analysis based on your last 7 days of data.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadAnalysis()}
                disabled={analysisLoading}
              >
                {analysisLoading ? "Loading..." : analysis || analysisFallback ? "Refresh" : "Generate"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysisFallback && (
              <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                {analysisFallback}
              </div>
            )}

            {analysisLoading ? (
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                <div className="h-16 rounded bg-muted/70 animate-pulse" />
              </div>
            ) : analysis && analysisSections.some(({ key }) => analysis[key].length > 0) ? (
              <div className="space-y-4">
                {analysisSections.map(({ key, title }) => (
                  <div key={key}>
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-sm font-semibold">{title}</p>
                      <Badge variant="outline">{analysis[key].length}</Badge>
                    </div>
                    {analysis[key].length > 0 ? (
                      <ul className="space-y-2">
                        {analysis[key].map((item) => (
                          <li key={item} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No items generated.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click Generate to fetch your weekly AI insights.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Rating */}
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm font-medium">Week Rating</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`text-lg transition-transform ${n <= rating ? "text-yellow-400" : "text-muted-foreground"} hover:scale-110`}
                >
                  <Star className="h-4 w-4" fill={n <= rating ? "currentColor" : "none"} />
                </button>
              ))}
              {rating > 0 && <span className="text-sm ml-1 text-muted-foreground self-center">{rating}/10</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-1.5">
            <Label>Wins</Label>
            <Textarea
              placeholder="What went well this week?"
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-1.5">
            <Label>Challenges</Label>
            <Textarea
              placeholder="What was difficult?"
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-1.5">
            <Label>Improvements</Label>
            <Textarea
              placeholder="What could be better?"
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-1.5">
            <Label>Focus Next Week</Label>
            <Textarea
              placeholder="What will you prioritize?"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : "Save Review"}
        </Button>

        {/* Past Reviews */}
        {past.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past Reviews</p>
            {past.map((review) => {
              const isExpanded = expanded === review.id;
              const label = new Date(review.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              return (
                <Card key={review.id}>
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    onClick={() => setExpanded(isExpanded ? null : review.id)}
                  >
                    <span className="text-sm font-medium">Week of {label}</span>
                    <div className="flex items-center gap-2">
                      {review.rating && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Star className="h-3 w-3 text-yellow-400" fill="currentColor" /> {review.rating}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <CardContent className="pt-0 pb-4 space-y-3">
                      {review.wins && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Wins</p>
                          <p className="text-sm mt-1">{review.wins}</p>
                        </div>
                      )}
                      {review.challenges && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Challenges</p>
                          <p className="text-sm mt-1">{review.challenges}</p>
                        </div>
                      )}
                      {review.focusNextWeek && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Focus</p>
                          <p className="text-sm mt-1">{review.focusNextWeek}</p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
