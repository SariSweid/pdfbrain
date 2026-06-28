import { useEffect, useMemo, useState } from "react";

import { getLecturerOverview, getUserProfile } from "../../lib/localStore";

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function LecturerPanel({ user }) {
  const [profile, setProfile] = useState(null);
  const [overview, setOverview] = useState({ students: [], papers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPanel() {
      setLoading(true);
      setError("");

      try {
        const [loadedProfile, loadedOverview] = await Promise.all([
          getUserProfile(user?.uid),
          getLecturerOverview(),
        ]);
        setProfile(loadedProfile);
        setOverview(loadedOverview);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPanel();
  }, [user?.uid]);

  const totals = useMemo(() => {
    const students = overview.students ?? [];
    return {
      students: students.length,
      papers: overview.papers?.length ?? 0,
      chats: students.reduce((sum, student) => sum + (student.chatCount ?? 0), 0),
      summaries: students.reduce((sum, student) => sum + (student.summaryCount ?? 0), 0),
      comparisons: students.reduce((sum, student) => sum + (student.comparisonCount ?? 0), 0),
    };
  }, [overview]);

  return (
    <main className="p-8 bg-slate-50 h-full overflow-y-auto">
      <section className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lecturer Panel</h1>
            <p className="mt-2 text-gray-600">
              Demo overview for students, uploaded papers, chat counts, summaries and comparisons.
            </p>
          </div>

          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg px-3 py-2 text-sm font-semibold">
            role: {profile?.role || "student"}
          </span>
        </div>

        {profile?.role !== "lecturer" && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm">
            Demo access is visible here. In production, restrict this page to users with role="lecturer".
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading && <p className="text-sm text-gray-500">Loading lecturer dashboard...</p>}

        {!loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat label="Students" value={totals.students} />
              <Stat label="Papers" value={totals.papers} />
              <Stat label="Chat messages" value={totals.chats} />
              <Stat label="Summaries" value={totals.summaries} />
              <Stat label="Comparisons" value={totals.comparisons} />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-bold text-gray-900">Students</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Papers</th>
                      <th className="p-3">Chats</th>
                      <th className="p-3">Summaries</th>
                      <th className="p-3">Comparisons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.students.map((student) => (
                      <tr key={student.uid} className="border-t border-gray-100">
                        <td className="p-3 font-semibold text-gray-900">{student.displayName}</td>
                        <td className="p-3 text-gray-600">{student.email}</td>
                        <td className="p-3">{student.paperCount}</td>
                        <td className="p-3">{student.chatCount}</td>
                        <td className="p-3">{student.summaryCount}</td>
                        <td className="p-3">{student.comparisonCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-bold text-gray-900">Uploaded Papers</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {overview.papers.map((paper) => (
                  <article key={`${paper.ownerId || "demo"}-${paper.id}`} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{paper.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {paper.ownerName} · {paper.ownerEmail}
                        </p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-700 rounded-full px-3 py-1">
                        {paper.chatCount} messages
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default LecturerPanel;
