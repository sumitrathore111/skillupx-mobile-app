

type Project = {
  id: string;
  title: string;
  description: string;
  contributors: { id: string; name: string; avatar?: string }[];
  tags?: string[];
  repoUrl?: string;
  websiteUrl?: string;
  coverImage?: string;
};

type Props = {
  project: Project;
  onContribute?: () => void;
};

export default function CourseAbout({ project, onContribute }: Props) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Cover Image */}
      {project.coverImage && (
        <div className="h-64 w-full rounded-2xl overflow-hidden mb-6">
          <img
            src={project.coverImage}
            alt={project.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {project.title}
        </h1>
        <button
          onClick={onContribute}
          className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          Contribute
        </button>
      </div>

      {/* Tags */}
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="text-sm px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-700 dark:text-slate-200"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed mb-8">
        {project.description}
      </p>

      {/* Links */}
      <div className="flex items-center gap-4 mb-10">
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Repository →
          </a>
        )}
        {project.websiteUrl && (
          <a
            href={project.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Live Site →
          </a>
        )}
      </div>

      {/* Contributors */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Contributors
        </h2>
        {project.contributors.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {project.contributors.map((contrib) => (
              <div
                key={contrib.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition"
              >
                {contrib.avatar ? (
                  <img
                    src={contrib.avatar}
                    alt={contrib.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                    {contrib.name?.charAt(0) || ''}
                  </div>
                )}
                <span className="font-medium text-slate-900 dark:text-white">
                  {contrib.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No contributors yet. Be the first one!</p>
        )}
      </div>
    </div>
  );
}

