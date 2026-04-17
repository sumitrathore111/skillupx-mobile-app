import { useState } from "react";
import { apiRequest } from "../../../service/api";
import { useAuth } from "../../../Context/AuthContext";


export function AddProjectModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tech, setTech] = useState("");
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!title || !desc || !user) return;

    try {
      await apiRequest('/projects', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: desc,
          techStack: tech.split(",").map((t) => t.trim()),
          status: "Planning",
          creatorId: user.id
        })
      });

      onClose();
    } catch (error) {
      console.error('Error adding project:', error);
      alert('Failed to add project');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-96 p-6 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold mb-4">➕ Add New Project</h2>
        <input
          type="text"
          placeholder="Project Title"
          className="w-full border p-2 rounded mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Project Description"
          className="w-full border p-2 rounded mb-3"
          rows={3}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <input
          type="text"
          placeholder="Tech Stack (comma separated)"
          className="w-full border p-2 rounded mb-3"
          value={tech}
          onChange={(e) => setTech(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
