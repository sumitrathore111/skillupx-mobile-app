import { useState } from "react";
import { X } from "lucide-react";

type IssueModalProps = {
  onClose: () => void;
  onSubmit: (data: {
    issueTitle: string,
    issueDescription: string
  }) => void 
};


export function IssueModal({ onClose , onSubmit }:IssueModalProps) {
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setissueDescription] = useState('')
  const handleSubmit = () => {
    onSubmit({  issueTitle  , issueDescription})
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute right-3 top-3">
          <X />
        </button>
        <h2 className="text-xl font-bold mb-4">Issue Title</h2>
        <textarea
          className="w-full border rounded-lg p-2 mb-4"
          placeholder="Issue Title"
          rows={4}
          value={issueTitle}
          onChange={(e) => setIssueTitle(e.target.value)}
        />
        <textarea
          placeholder="Issue Description"
          value={issueDescription}
          onChange={(e) => setissueDescription(e.target.value)}
          className="w-full border border-gray-300 rounded px-4 py-2 h-24"
        />
        <button
          onClick={handleSubmit}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
