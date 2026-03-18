"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { upsertWeeklyReview } from "@/app/actions/reviews";
import { getWeekStart } from "@/lib/utils";
import { ChevronDown, ChevronUp, Star, TrendingUp, Clock, Moon, CheckSquare } from "lucide-react";

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
}

export function ReviewsClient({ current, allReviews, weeklyStats }: Props) {
  const [wins, setWins] = useState(current?.wins ?? "");
  const [challenges, setChallenges] = useState(current?.challenges ?? "");
  const [improvements, setImprovements] = useState(current?.improvements ?? "");
  const [focus, setFocus] = useState(current?.focusNextWeek ?? "");
  const [rating, setRating] = useState<number>(current?.rating ?? 0);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  const stats = [
    { icon: TrendingUp, label: "Habit Rate", value: `${weeklyStats.habitCompletionRate}%`, color: "text-green-500" },
    { icon: Clock, label: "Deep Work", value: `${weeklyStats.totalDeepWork}h`, color: "text-blue-500" },
    { icon: Moon, label: "Avg Sleep", value: `${weeklyStats.avgSleep}h`, color: "text-indigo-400" },
    { icon: CheckSquare, label: "Tasks Done", value: String(weeklyStats.tasksCompleted), color: "text-orange-500" },
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
