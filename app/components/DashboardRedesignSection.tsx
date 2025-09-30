"use client";

import React from "react";
import {
  TrendingUp,
  Users,
  CheckCircle,
  Star,
  ChevronRight,
  Clock,
  MessageCircle,
  Video,
  Book,
} from "lucide-react";

// This component only renders UI. It expects live data and callbacks from the container.
// No demo/default data is added here.

export type DashboardRedesignSectionProps = {
  user: {
    totalEarnings: number;
    totalSessions: number;
    credits: number;
  };
  skills: Array<{
    id: string | number;
    title?: string;
    students?: number;
    earnings?: number;
    rating?: number;
  }>;
  sessions: Array<{
    id: string;
    title?: string;
    skillTitle?: string;
    student?: string;
    studentName?: string;
    time?: string;
    status?: string;
  }>;
  onOpenChat: (sessionId?: string) => void;
  onStartCall: (sessionId?: string) => void;
};

export default function DashboardRedesignSection({ user, skills, sessions, onOpenChat, onStartCall }: DashboardRedesignSectionProps) {
  const upcoming = Array.isArray(sessions)
    ? sessions.filter((s) => (s.status || "").toLowerCase().includes("upcoming")).slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Earnings", value: `$${Number(user.totalEarnings || 0)}`, icon: TrendingUp, color: "from-green-500 to-emerald-600" },
          { label: "Active Students", value: String(skills?.reduce((acc, s) => acc + (Number((s as any).students || 0)), 0)), icon: Users, color: "from-blue-500 to-cyan-600" },
          { label: "Completed Sessions", value: String(user.totalSessions || 0), icon: CheckCircle, color: "from-purple-500 to-pink-600" },
          { label: "Credits", value: String(user.credits || 0), icon: Star, color: "from-yellow-500 to-orange-600" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon size={20} className="text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Start Session", icon: Video, color: "from-green-600 to-emerald-600", onClick: () => onStartCall() },
          { label: "Messages", icon: MessageCircle, color: "from-orange-600 to-red-600", onClick: () => onOpenChat() },
          { label: "Manage Skills", icon: Book, color: "from-blue-600 to-purple-600", onClick: () => {/* nav handled by parent via tabs */} },
          { label: "Analytics", icon: TrendingUp, color: "from-pink-600 to-purple-600", onClick: () => {/* placeholder action - parent may override if needed */} },
        ].map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`bg-gradient-to-r ${action.color} text-white p-6 rounded-2xl hover:shadow-lg transition-all group`}
          >
            <action.icon size={24} className="mb-3" />
            <p className="font-semibold">{action.label}</p>
          </button>
        ))}
      </div>

      {/* Upcoming Sessions + Top Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Sessions</h3>
            <span className="text-blue-600 text-sm font-medium flex items-center gap-1">
              {upcoming.length} items <ChevronRight size={14} />
            </span>
          </div>
          <div className="space-y-3">
            {upcoming.length > 0 ? upcoming.map((session) => (
              <div key={session.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                  {(session.student || session.studentName || "").charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{session.title || session.skillTitle || "Session"}</p>
                  <p className="text-sm text-gray-600">{session.student || session.studentName || ""}</p>
                  {session.time && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Clock size={12} />
                      {session.time}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenChat(session.id)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-50 shadow-sm"
                  >
                    <MessageCircle size={16} className="text-blue-600" />
                  </button>
                  <button
                    onClick={() => onStartCall(session.id)}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Video size={16} />
                  </button>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-500">No upcoming sessions.</p>
            )}
          </div>
        </div>

        {/* Top Skills */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Skills</h3>
          </div>
          <div className="space-y-3">
            {skills && skills.length > 0 ? skills.map((skill, index) => (
              <div key={skill.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                  'bg-gradient-to-br from-orange-400 to-red-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{skill.title || `Skill #${skill.id}`}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                    {typeof (skill as any).students !== 'undefined' && (
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {(skill as any).students} students
                      </span>
                    )}
                    {typeof (skill as any).rating !== 'undefined' && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500 fill-current" />
                        {(skill as any).rating}
                      </span>
                    )}
                  </div>
                </div>
                {(skill as any).earnings ? (
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${(skill as any).earnings}</p>
                    <p className="text-xs text-gray-500">earned</p>
                  </div>
                ) : null}
              </div>
            )) : (
              <p className="text-sm text-gray-500">No skills yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Notifications intentionally omitted to avoid demo data. */}
    </div>
  );
}
