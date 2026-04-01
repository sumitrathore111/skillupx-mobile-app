import  { useState } from "react";

interface CreateNewPostModalProps {
  
    onClose: () => void;
    onSubmit: (data: {
        jobRole: string;
        description: string;
        techstack: Array<String>;
    }) => void;
}

function CreateNewPost({ onClose , onSubmit }: CreateNewPostModalProps) {
    const [jobRole, setJobRole] = useState("");
    const [description, setDescription] = useState("");
    const [techStack, settechStack] = useState("");
    

    const handleSubmit = () => {
        const lts = techStack.split(",").map((t) => t.trim())
        onSubmit({ jobRole, description, techstack: lts })
        settechStack('')
        setDescription("");
        setJobRole('')
        onClose();
    };



    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Post a New Job</h2>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Job Title"
                        value={jobRole}
                        onChange={(e) => setJobRole(e.target.value)}
                        className="w-full border border-gray-300 rounded px-4 py-2"
                    />
                    <textarea
                        placeholder="Job Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded px-4 py-2 h-24"
                    />
                    <input
                        type="text"
                        placeholder="Required Skills (comma separated)"
                        value={techStack}
                        onChange={(e) => settechStack(e.target.value)}
                        className="w-full border border-gray-300 rounded px-4 py-2"
                    />
                   
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
                    >
                        Post Job
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateNewPost;
