'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PlayerHeadshot } from "@/components/player-headshot"
import { UserAvatar } from "@/components/user-avatar"

interface DraftAnalysisProps {
  draftId: string;
}

interface TeamGrade {
  rosterId: number;
  teamName: string;
  ownerName?: string;
  ownerAvatar?: string;
  ownerUsername?: string;
  picks: any[];
  totalPicks: number;
  rankedPicks: number;
  averageRank: number;
  totalValue: number;
  averageValue: number;
  steals: number;
  reaches: number;
  stealRatio: number;
  reachRatio: number;
  gradeScore: number;
  tierBreakdown: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
  };
  positions: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
    K: number;
    DEF: number;
  };
  grade: string;
}

interface DraftAnalysisData {
  draft: any;
  picks: any[];
  tradedPicks: any[];
  rosters: any[];
  users: any[];
  pickOwnership: any;
  teamPicks: any;
  teamGrades: TeamGrade[];
  playerRankings: any;
}

const gradeColors = {
  'A+': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'A-': 'bg-yellow-400/20 text-yellow-400 border-yellow-400',
  'B+': 'bg-green-400/20 text-green-400 border-green-400',
  'B': 'bg-green-400/20 text-green-400 border-green-400',
  'B-': 'bg-green-400/20 text-green-400 border-green-400',
  'C+': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'C-': 'bg-blue-400/20 text-blue-400 border-blue-400',
  'D': 'bg-red-400/20 text-red-400 border-red-400',
  'F': 'bg-red-400/20 text-red-400 border-red-400',
};

export default function DraftAnalysis({ draftId }: DraftAnalysisProps) {
  const [data, setData] = useState<DraftAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'grade' | 'team'>('grade');
  const [picksPage, setPicksPage] = useState(1);
  const PICKS_PER_PAGE = 50;
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartsIndex, setChartsIndex] = useState(0);
  const charts = [
    {
      key: 'comprehensiveRankings',
      title: 'Comprehensive Team Rankings',
      barColor: '#f59e0b', // amber-500
      labelColor: '#f59e0b',
      valueKey: 'comprehensiveScore',
      leaderboardColor: 'text-amber-500',
      getData: (teamGrades) => {
        // Calculate comprehensive score for each team
        const teamsWithScores = teamGrades.map(tg => {
          // Normalize each metric to 0-100 scale
          const avgRankScore = Math.max(0, 100 - (tg.averageRank - 1) * 2); // Lower rank = higher score
          const totalValueScore = Math.min(100, (tg.totalValue / 1000) * 10); // Normalize to 1000 max
          const valuePerPickScore = Math.min(100, (tg.averageValue / 100) * 10); // Normalize to 100 max
          const stealScore = Math.min(100, tg.stealRatio * 2); // Steal ratio * 2 (max 100%)
          const reachPenalty = Math.max(0, 100 - (tg.reachRatio * 2)); // Reach penalty
          const tier1Bonus = tg.tierBreakdown.tier1 * 10; // 10 points per tier 1 pick
          const tier2Bonus = tg.tierBreakdown.tier2 * 5; // 5 points per tier 2 pick
          
          // Weighted composite score
          const comprehensiveScore = Math.round(
            (avgRankScore * 0.25) + // 25% weight
            (totalValueScore * 0.20) + // 20% weight
            (valuePerPickScore * 0.20) + // 20% weight
            (stealScore * 0.15) + // 15% weight
            (reachPenalty * 0.10) + // 10% weight
            (tier1Bonus * 0.07) + // 7% weight
            (tier2Bonus * 0.03) // 3% weight
          );
          
          return {
            label: tg.teamName,
            value: comprehensiveScore,
            details: {
              avgRank: tg.averageRank,
              totalValue: tg.totalValue,
              avgValue: tg.averageValue,
              steals: tg.steals,
              reaches: tg.reaches,
              tier1: tg.tierBreakdown.tier1,
              tier2: tg.tierBreakdown.tier2,
              grade: tg.grade
            }
          };
        });
        
        return teamsWithScores;
      },
      getLeaderboard: (teamGrades) => {
        // Same calculation as getData but return sorted leaderboard
        const teamsWithScores = teamGrades.map(tg => {
          const avgRankScore = Math.max(0, 100 - (tg.averageRank - 1) * 2);
          const totalValueScore = Math.min(100, (tg.totalValue / 1000) * 10);
          const valuePerPickScore = Math.min(100, (tg.averageValue / 100) * 10);
          const stealScore = Math.min(100, tg.stealRatio * 2);
          const reachPenalty = Math.max(0, 100 - (tg.reachRatio * 2));
          const tier1Bonus = tg.tierBreakdown.tier1 * 10;
          const tier2Bonus = tg.tierBreakdown.tier2 * 5;
          
          const comprehensiveScore = Math.round(
            (avgRankScore * 0.25) +
            (totalValueScore * 0.20) +
            (valuePerPickScore * 0.20) +
            (stealScore * 0.15) +
            (reachPenalty * 0.10) +
            (tier1Bonus * 0.07) +
            (tier2Bonus * 0.03)
          );
          
          return {
            label: tg.teamName,
            value: comprehensiveScore,
            details: {
              avgRank: tg.averageRank,
              totalValue: tg.totalValue,
              avgValue: tg.averageValue,
              steals: tg.steals,
              reaches: tg.reaches,
              tier1: tg.tierBreakdown.tier1,
              tier2: tg.tierBreakdown.tier2,
              grade: tg.grade
            }
          };
        });
        
        return teamsWithScores.sort((a, b) => b.value - a.value);
      },
    },
    {
      key: 'reaches',
      title: 'Reaches by Team',
      barColor: '#f87171', // red-400
      labelColor: '#f87171',
      valueKey: 'reaches',
      leaderboardColor: 'text-red-400',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.reaches })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => b.reaches - a.reaches).map(tg => ({ label: tg.teamName, value: tg.reaches })),
    },
    {
      key: 'steals',
      title: 'Steals by Team',
      barColor: '#34d399', // green-400
      labelColor: '#34d399',
      valueKey: 'steals',
      leaderboardColor: 'text-green-400',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.steals })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => b.steals - a.steals).map(tg => ({ label: tg.teamName, value: tg.steals })),
    },
    {
      key: 'tier1',
      title: 'Tier 1 Picks by Team',
      barColor: '#fde68a', // yellow-300
      labelColor: '#fde68a',
      valueKey: 'tier1',
      leaderboardColor: 'text-yellow-300',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.tierBreakdown.tier1 })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => b.tierBreakdown.tier1 - a.tierBreakdown.tier1).map(tg => ({ label: tg.teamName, value: tg.tierBreakdown.tier1 })),
    },
    {
      key: 'totalValue',
      title: 'Team Rankings by Total Value',
      barColor: '#60a5fa', // blue-400
      labelColor: '#60a5fa',
      valueKey: 'totalValue',
      leaderboardColor: 'text-blue-400',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.totalValue })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => b.totalValue - a.totalValue).map(tg => ({ label: tg.teamName, value: tg.totalValue })),
    },
    {
      key: 'bestWR',
      title: 'Best WR Groups',
      barColor: '#a78bfa', // purple-400
      labelColor: '#a78bfa',
      valueKey: 'WR',
      leaderboardColor: 'text-purple-400',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.positions.WR })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => b.positions.WR - a.positions.WR).map(tg => ({ label: tg.teamName, value: tg.positions.WR })),
    },
    {
      key: 'bestRB',
      title: 'Best RB Groups',
      barColor: '#10b981', // emerald-500
      labelColor: '#10b981',
      valueKey: 'RB',
      leaderboardColor: 'text-emerald-500',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.positions.RB })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => b.positions.RB - a.positions.RB).map(tg => ({ label: tg.teamName, value: tg.positions.RB })),
    },
    {
      key: 'bestQB',
      title: 'Best QB Groups',
      barColor: '#3b82f6', // blue-500
      labelColor: '#3b82f6',
      valueKey: 'QB',
      leaderboardColor: 'text-blue-500',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.positions.QB })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => b.positions.QB - a.positions.QB).map(tg => ({ label: tg.teamName, value: tg.positions.QB })),
    },
    {
      key: 'bestTE',
      title: 'Best TE Groups',
      barColor: '#8b5cf6', // violet-500
      labelColor: '#8b5cf6',
      valueKey: 'TE',
      leaderboardColor: 'text-violet-500',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.positions.TE })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => b.positions.TE - a.positions.TE).map(tg => ({ label: tg.teamName, value: tg.positions.TE })),
    },
    {
      key: 'avgAge',
      title: 'Average Player Age by Team',
      barColor: '#f472b6', // pink-400
      labelColor: '#f472b6',
      valueKey: 'averageAge',
      leaderboardColor: 'text-pink-400',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.averageAge })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => a.averageAge - b.averageAge).map(tg => ({ label: tg.teamName, value: tg.averageAge })),
    },
    {
      key: 'avgRank',
      title: 'Average Pick Rank by Team',
      barColor: '#38bdf8', // sky-400
      labelColor: '#38bdf8',
      valueKey: 'averageRank',
      leaderboardColor: 'text-sky-400',
      getData: (teamGrades) => teamGrades.map(tg => ({ label: tg.teamName, value: tg.averageRank })),
      getLeaderboard: (teamGrades) => teamGrades.slice().sort((a, b) => a.averageRank - b.averageRank).map(tg => ({ label: tg.teamName, value: tg.averageRank })),
    },
  ];
  const currentChart = charts[chartsIndex];

  useEffect(() => {
    setPicksPage(1); // Reset page on new draft
  }, [draftId]);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/draft-analysis?draftId=${draftId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch draft analysis');
        }
        const analysisData = await response.json();
        setData(analysisData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (draftId) {
      fetchAnalysis();
    }
  }, [draftId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Analyzing draft...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-200">No draft analysis available</p>
      </div>
    );
  }

  // Sorting logic for team grades
  let sortedTeamGrades = [...data.teamGrades];
  if (sortMode === 'grade') {
    sortedTeamGrades.sort((a, b) => b.gradeScore - a.gradeScore);
  } else {
    sortedTeamGrades.sort((a, b) => a.teamName.localeCompare(b.teamName));
  }

  // After you have all teamGrades and before rendering, assign grades by percentile
  if (data && data.teamGrades) {
    const scores = data.teamGrades.map(t => t.gradeScore);
    const sortedScores = [...scores].sort((a, b) => a - b);
    function getPercentile(score) {
      const below = sortedScores.filter(s => s < score).length;
      return (below / sortedScores.length) * 100;
    }
    data.teamGrades = data.teamGrades.map(team => {
      const percentile = getPercentile(team.gradeScore);
      let letter = 'D';
      if (percentile >= 90) letter = 'A+';
      else if (percentile >= 80) letter = 'A';
      else if (percentile >= 70) letter = 'A-';
      else if (percentile >= 60) letter = 'B+';
      else if (percentile >= 50) letter = 'B';
      else if (percentile >= 40) letter = 'B-';
      else if (percentile >= 30) letter = 'C+';
      else if (percentile >= 20) letter = 'C';
      else if (percentile >= 10) letter = 'C-';
      // else D
      return { ...team, grade: letter };
    });
  }

  // Pagination logic for picks
  const totalPicks = data.picks.length;
  const totalPages = Math.ceil(totalPicks / PICKS_PER_PAGE);
  const pagedPicks = data.picks.slice((picksPage - 1) * PICKS_PER_PAGE, picksPage * PICKS_PER_PAGE);

  return (
    <div className={isExpanded ? 'fixed inset-0 z-50 m-0 rounded-none bg-slate-800 border border-slate-700 overflow-y-auto' : 'space-y-6'}>
      {/* Draft Overview */}
      <Card className={isExpanded ? 'bg-slate-800 border-slate-700 rounded-none' : 'bg-slate-800 border-slate-700'}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-100 flex items-center gap-4">
            Draft Overview
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="ml-2 bg-slate-700 text-white px-3 py-1 rounded-lg font-mono text-sm hover:bg-slate-600 transition-colors flex items-center space-x-1"
                  title="Minimize"
                >
                  <Minimize2 className="h-4 w-4" />
                  <span>MINIMIZE</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="ml-2 bg-slate-700 text-white px-3 py-1 rounded-lg font-mono text-sm hover:bg-slate-600 transition-colors flex items-center space-x-1"
                  title="Expand to full screen"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span>EXPAND</span>
                </button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-400">Teams</p>
              <p className="text-lg font-semibold text-slate-100">{data.draft.settings.teams}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Rounds</p>
              <p className="text-lg font-semibold text-slate-100">{data.draft.settings.rounds}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Picks</p>
              <p className="text-lg font-semibold text-slate-100">{data.picks.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Traded Picks</p>
              <p className="text-lg font-semibold text-slate-100">{data.tradedPicks.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Grades */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-100 flex items-center gap-4">
            Team Grades
            <span className="inline-flex items-center gap-1">
              <Badge
                variant={sortMode === 'grade' ? 'default' : 'outline'}
                className={`cursor-pointer bg-yellow-400/20 text-yellow-400 border-yellow-400 text-xs px-2 py-1 border ${sortMode === 'grade' ? 'ring-2 ring-yellow-400' : ''}`}
                onClick={() => setSortMode('grade')}
              >
                Sort: Grade
              </Badge>
              <Badge
                variant={sortMode === 'team' ? 'default' : 'outline'}
                className={`cursor-pointer bg-blue-400/20 text-blue-400 border-blue-400 text-xs px-2 py-1 border ${sortMode === 'team' ? 'ring-2 ring-blue-400' : ''}`}
                onClick={() => setSortMode('team')}
              >
                Sort: Team
              </Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTeamGrades.map((team) => (
              <Card key={team.rosterId} className="p-4 bg-slate-800 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <UserAvatar
                      avatarId={team.ownerAvatar}
                      displayName={team.ownerName || team.teamName}
                      username={team.ownerUsername}
                      size={32}
                      className="flex-shrink-0"
                    />
                    <h3 className="font-semibold text-slate-100">{team.teamName}</h3>
                  </div>
                  <Badge variant="outline" className={gradeColors[team.grade as keyof typeof gradeColors] + " text-sm px-2 py-1 border"}>
                    {team.grade}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm text-slate-200">
                  <div className="flex justify-between">
                    <span>Total Picks:</span>
                    <span className="text-slate-100">{team.totalPicks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Rank:</span>
                    <span className="text-slate-100">{team.averageRank}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grade Score:</span>
                    <span className="text-slate-100">{team.gradeScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Steals:</span>
                    <span className="text-green-400">{team.steals} ({team.stealRatio}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reaches:</span>
                    <span className="text-red-400">{team.reaches} ({team.reachRatio}%)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-600">
                    <p className="text-xs text-slate-400 mb-1">Tier Breakdown:</p>
                    <div className="flex flex-wrap gap-1">
                      {team.tierBreakdown.tier1 > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-400/20 text-green-400 border-green-400" >
                          T1: {team.tierBreakdown.tier1}
                        </Badge>
                      )}
                      {team.tierBreakdown.tier2 > 0 && (
                        <Badge variant="outline" className="text-xs bg-blue-400/20 text-blue-400 border-blue-400" >
                          T2: {team.tierBreakdown.tier2}
                        </Badge>
                      )}
                      {team.tierBreakdown.tier3 > 0 && (
                        <Badge variant="outline" className="text-xs bg-yellow-400/20 text-yellow-400 border-yellow-400" >
                          T3: {team.tierBreakdown.tier3}
                        </Badge>
                      )}
                      {team.tierBreakdown.tier4 > 0 && (
                        <Badge variant="outline" className="text-xs bg-slate-400/20 text-slate-400 border-slate-400" >
                          T4: {team.tierBreakdown.tier4}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-600">
                    <p className="text-xs text-slate-400 mb-1">Position Breakdown:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(team.positions).map(([pos, count]) => (
                        count > 0 && (
                          <Badge key={pos} variant="outline" className={
                            `text-xs border ${
                              pos === 'QB' ? 'bg-blue-400/20 text-blue-400 border-blue-400' :
                              pos === 'RB' ? 'bg-green-400/20 text-green-400 border-green-400' :
                              pos === 'WR' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400' :
                              pos === 'TE' ? 'bg-purple-400/20 text-purple-400 border-purple-400' :
                              pos === 'K' ? 'bg-pink-400/20 text-pink-400 border-pink-400' :
                              pos === 'DEF' ? 'bg-slate-400/20 text-slate-400 border-slate-400' :
                              'bg-slate-700/20 text-slate-400 border-slate-700'
                            }`
                          }>
                            {pos}: {count}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <Tabs defaultValue="picks" className="w-full bg-slate-800 border border-slate-700 rounded-lg">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-b border-slate-700">
          <TabsTrigger value="picks" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-400">All Picks</TabsTrigger>
          <TabsTrigger value="trades" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-400">Traded Picks</TabsTrigger>
          <TabsTrigger value="ownership" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-400">Pick Ownership</TabsTrigger>
          <TabsTrigger value="charts" className="text-slate-200 data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-400">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="picks" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">All Draft Picks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-slate-300">Round</TableHead>
                    <TableHead className="text-slate-300">Pick</TableHead>
                    <TableHead className="text-slate-300">Player</TableHead>
                    <TableHead className="text-slate-300">Position</TableHead>
                    <TableHead className="text-slate-300">Team</TableHead>
                    <TableHead className="text-slate-300">Team</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedPicks.map((pick, index) => {
                    const pickTeam = data.users?.find((u: any) => u?.user_id === data.rosters?.find((r: any) => r.roster_id === pick.roster_id)?.owner_id)?.metadata?.team_name || data.users?.find((u: any) => u?.user_id === data.rosters?.find((r: any) => r.roster_id === pick.roster_id)?.owner_id)?.display_name || `Team ${pick.roster_id}`;
                    return (
                      <TableRow key={index}>
                        <TableCell className="text-slate-200">{pick.round}</TableCell>
                        <TableCell className="text-slate-200">{pick.pick_no}</TableCell>
                        <TableCell className="text-slate-200">
                          {pick.metadata?.first_name} {pick.metadata?.last_name}
                        </TableCell>
                        <TableCell className="text-slate-200">{pick.metadata?.position}</TableCell>
                        <TableCell className="text-slate-200">{pick.metadata?.team}</TableCell>
                        <TableCell className="text-slate-200">{data.users?.find((u: any) => u?.user_id === data.rosters?.find((r: any) => r.roster_id === pick.roster_id)?.owner_id)?.metadata?.team_name || data.users?.find((u: any) => u?.user_id === data.rosters?.find((r: any) => r.roster_id === pick.roster_id)?.owner_id)?.display_name || `Team ${pick.roster_id}`}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-slate-400 text-xs">
                  Showing {((picksPage - 1) * PICKS_PER_PAGE) + 1} - {Math.min(picksPage * PICKS_PER_PAGE, totalPicks)} of {totalPicks} picks
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-slate-700 text-slate-200 border-slate-600 px-3 py-1 text-xs"
                    disabled={picksPage === 1}
                    onClick={() => setPicksPage(p => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-slate-700 text-slate-200 border-slate-600 px-3 py-1 text-xs"
                    disabled={picksPage === totalPages}
                    onClick={() => setPicksPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Traded Picks</CardTitle>
            </CardHeader>
            <CardContent>
              {data.tradedPicks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-300">Round</TableHead>
                      <TableHead className="text-slate-300">Original Owner</TableHead>
                      <TableHead className="text-slate-300">Current Owner</TableHead>
                      <TableHead className="text-slate-300">Season</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tradedPicks.map((trade, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-slate-200">{trade.round}</TableCell>
                        <TableCell className="text-slate-200">{trade.previous_owner_id}</TableCell>
                        <TableCell className="text-slate-200">{trade.owner_id}</TableCell>
                        <TableCell className="text-slate-200">{trade.season}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-slate-400 text-center py-4">No traded picks found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ownership" className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Pick Ownership Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-300">Round</TableHead>
                      {Array.from({ length: data.draft.settings.teams }, (_, i) => (
                        <TableHead key={i + 1} className="text-slate-300">Slot {i + 1}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(data.pickOwnership).map(([round, slots]) => (
                      <TableRow key={round}>
                        <TableCell className="font-medium text-slate-200">{round}</TableCell>
                        {Array.from({ length: data.draft.settings.teams }, (_, i) => (
                          <TableCell key={i + 1} className="text-slate-200">
                            {slots[i + 1] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <button
                onClick={() => setChartsIndex((chartsIndex - 1 + charts.length) % charts.length)}
                className="p-1 text-slate-400 hover:text-yellow-400"
                aria-label="Previous Chart"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <CardTitle className="text-slate-100 text-center flex-1">{currentChart.title}</CardTitle>
              <button
                onClick={() => setChartsIndex((chartsIndex + 1) % charts.length)}
                className="p-1 text-slate-400 hover:text-yellow-400"
                aria-label="Next Chart"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <BarChart
                data={currentChart.getData(data.teamGrades)}
                barColor={currentChart.barColor}
                labelColor={currentChart.labelColor}
                maxBarWidth={300}
              />
              <div className="mt-4">
                <h4 className="text-slate-200 text-sm mb-2">Leaderboard</h4>
                <ol className="list-decimal pl-6 text-slate-300">
                  {currentChart.getLeaderboard(data.teamGrades).map((row, i) => (
                    <li key={row.label} className="mb-1">
                      <span className={`font-bold ${currentChart.leaderboardColor}`}>{row.value}</span> — {row.label}
                      {currentChart.key === 'comprehensiveRankings' && row.details && (
                        <div className="ml-4 mt-1 text-xs text-slate-400">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <span>Avg Rank: {row.details.avgRank}</span>
                            <span>Total Value: {row.details.totalValue}</span>
                            <span>Avg Value: {row.details.avgValue}</span>
                            <span>Steals: {row.details.steals}</span>
                            <span>Reaches: {row.details.reaches}</span>
                            <span>Tier 1: {row.details.tier1}</span>
                            <span>Tier 2: {row.details.tier2}</span>
                            <span>Grade: {row.details.grade}</span>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              
              {/* Algorithm Explanation for Comprehensive Rankings */}
              {currentChart.key === 'comprehensiveRankings' && (
                <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                  <h5 className="text-amber-400 font-mono text-sm mb-3">ALGORITHM BREAKDOWN</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                    <div>
                      <h6 className="text-amber-300 font-semibold mb-2">Score Components:</h6>
                      <ul className="space-y-1">
                        <li>• <span className="text-amber-400">25%</span> Average Pick Rank (lower = better)</li>
                        <li>• <span className="text-amber-400">20%</span> Total Value</li>
                        <li>• <span className="text-amber-400">20%</span> Value per Pick</li>
                        <li>• <span className="text-amber-400">15%</span> Steal Ratio</li>
                        <li>• <span className="text-amber-400">10%</span> Reach Penalty</li>
                        <li>• <span className="text-amber-400">7%</span> Tier 1 Bonus</li>
                        <li>• <span className="text-amber-400">3%</span> Tier 2 Bonus</li>
                      </ul>
                    </div>
                    <div>
                      <h6 className="text-amber-300 font-semibold mb-2">Scoring Logic:</h6>
                      <ul className="space-y-1">
                        <li>• All metrics normalized to 0-100 scale</li>
                        <li>• Steals rewarded, reaches penalized</li>
                        <li>• Tier 1 picks worth 10 points each</li>
                        <li>• Tier 2 picks worth 5 points each</li>
                        <li>• Final score: 0-100 composite</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// BarChart component (simple SVG bar chart)
function BarChart({ data, barColor, labelColor, maxBarWidth = 300 }) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value)), [data]);
  return (
    <div className="space-y-1">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="w-32 truncate text-xs" style={{ color: labelColor }}>{d.label}</span>
          <div className="flex-1 bg-slate-700 rounded h-4 relative">
            <div
              className="h-4 rounded"
              style={{
                width: `${maxValue ? (d.value / maxValue) * maxBarWidth : 0}px`,
                background: barColor,
                transition: 'width 0.3s',
              }}
            />
            <span className="absolute left-2 top-0 text-xs text-slate-900 font-bold" style={{ lineHeight: '1rem' }}>{d.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
} 