import { useNavigate } from "react-router-dom";

export function ProjectCard({ project }: any) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition cursor-pointer"
      onClick={() => navigate(`/dashboard/openproject/${project.id}`)}
    >
      <h2 className="text-xl font-semibold text-gray-700 mb-2">{project.title}</h2>
      <p className="text-sm text-gray-500 line-clamp-2">{project.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {project.techStack?.map((tech: string, idx: number) => (
          <span
            key={idx}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}
