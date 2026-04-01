import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { ProjectIssue } from "../../service/projectsService";
import { createIssue, getProjectIssues, updateIssueStatus } from "../../service/projectsService";


export default function Issues() {
  const { id } = useParams();
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchIssues = async () => {
      try {
        const issuesData = await getProjectIssues(id);
        setIssues(issuesData);
      } catch (error) {
        console.error("Error fetching issues:", error);
      }
    };
    fetchIssues();
  }, [id]);

  const addIssue = async () => {
    if (!title || !id) return;
    try {
      const newIssue = await createIssue(id, {
        title,
        description: desc,
      });
      if (newIssue) {
        setIssues([newIssue, ...issues]);
      }
      setTitle("");
      setDesc("");
    } catch (error) {
      console.error("Error adding issue:", error);
    }
  };

  const updateStatus = async (issueId: string, newStatus: 'Open' | 'Resolved' | 'In Progress') => {
    if (!id) return;
    try {
      await updateIssueStatus(id, issueId, newStatus);
      setIssues(issues.map(issue =>
        (issue.id || issue._id) === issueId
          ? { ...issue, status: newStatus }
          : issue
      ));
    } catch (error) {
      console.error("Error updating issue:", error);
    }
  };

  return (
    <div className="mt-4 sm:mt-6 border rounded-lg sm:rounded-xl p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
      <h2 className="text-base sm:text-lg font-semibold mb-2 text-gray-900 dark:text-white">Issues</h2>
      <ul>
        {issues.map((iss) => (
          <li key={iss.id || iss._id} className="mb-2 border-b dark:border-gray-700 pb-2">
            <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{iss.title}</p>
            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{iss.description}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Status: {iss.status}</p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1">
              <button
                onClick={() => updateStatus(iss.id || iss._id || '', "In Progress")}
                className="px-2 py-1 text-xs sm:text-sm bg-yellow-400 text-white rounded"
              >
                In Progress
              </button>
              <button
                onClick={() => updateStatus(iss.id || iss._id || '', "Resolved")}
                className="px-2 py-1 text-xs sm:text-sm bg-green-500 text-white rounded"
              >
                Resolved
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <input
          className="border rounded px-2 py-1 mb-2 w-full text-sm sm:text-base bg-white dark:bg-gray-900 dark:border-gray-600 text-gray-900 dark:text-white"
          placeholder="Issue Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="border rounded px-2 py-1 mb-2 w-full text-sm sm:text-base bg-white dark:bg-gray-900 dark:border-gray-600 text-gray-900 dark:text-white"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button
          onClick={addIssue}
          className="bg-red-500 text-white px-3 py-1.5 text-sm sm:text-base rounded"
        >
          Add Issue
        </button>
      </div>
    </div>
  );
}
