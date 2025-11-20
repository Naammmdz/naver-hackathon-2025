export function ArticlesSection() {
  return (
  <section className="tw-mt-5 tw-flex tw-min-h-[80vh] tw-w-full tw-flex-col tw-place-content-center tw-place-items-center tw-p-[2%] max-lg:tw-p-3" id="blog">
    <h3 className="reveal-up tw-text-4xl tw-font-medium max-md:tw-text-2xl">
      Latest from the DevHolic blog
    </h3>
    {/* articles */}
    <div className="reveal-up tw-mt-10 tw-flex tw-flex-wrap tw-place-content-center tw-gap-10 max-lg:tw-flex-col">
      <a href="#" className="tw-flex tw-h-[500px] tw-w-[400px] tw-flex-col tw-gap-2 tw-overflow-clip tw-rounded-lg tw-p-4 max-lg:tw-w-[350px]">
        <div className="tw-h-[350px] tw-min-h-[350px] tw-w-full tw-overflow-hidden tw-rounded-2xl">
          <img src="/assets/images/home/article1.png" alt="article image" className="tw-h-full tw-w-full tw-object-cover tw-transition-transform tw-duration-700 hover:tw-scale-[1.3]" />
        </div>
        <div className="tw-text-gray-600 dark:tw-text-gray-300 tw-justify-between tw-flex tw-gap-2">
          <div className="tw-text-gray-800 dark:tw-text-gray-200">
            Realtime Collaboration
          </div>
          <div className="tw-text-gray-600 dark:tw-text-gray-400">
            Oct, 16, 2025
          </div>
        </div>
        <h3 className="tw-mt-1 tw-font-medium tw-text-xl max-md:tw-text-xl">
          Realtime Docs with BlockNote + Yjs: A Practical Guide
        </h3>
      </a>
      <a href="#" className="tw-flex tw-h-[500px] tw-w-[400px] tw-flex-col tw-gap-2 tw-overflow-clip tw-rounded-lg tw-p-4 max-lg:tw-w-[350px]">
        <div className="tw-h-[350px] tw-min-h-[350px] tw-w-full tw-overflow-hidden tw-rounded-2xl">
          <img src="/assets/images/home/article2.jpg" alt="article image" className="tw-h-full tw-w-full tw-object-cover tw-transition-transform tw-duration-700 hover:tw-scale-[1.3]" />
        </div>
        <div className="tw-text-gray-600 dark:tw-text-gray-300 tw-justify-between tw-flex tw-gap-2">
          <div className="tw-text-gray-800 dark:tw-text-gray-200">
            Whiteboard
          </div>
          <div className="tw-text-gray-600 dark:tw-text-gray-400">
            Oct, 10, 2025
          </div>
        </div>
        <h3 className="tw-mt-1 tw-font-medium tw-text-xl max-md:tw-text-xl">
          Collaborative Boards with Excalidraw + Yjs Awareness
        </h3>
      </a>
      <a href="#" className="tw-flex tw-h-[500px] tw-w-[400px] tw-flex-col tw-gap-2 tw-overflow-clip tw-rounded-lg tw-p-4 max-lg:tw-w-[350px]">
        <div className="tw-h-[350px] tw-min-h-[350px] tw-w-full tw-overflow-hidden tw-rounded-2xl">
          <img src="/assets/images/home/article3.png" alt="article image" className="tw-h-full tw-w-full tw-object-cover tw-transition-transform tw-duration-700 hover:tw-scale-[1.3]" />
        </div>
        <div className="tw-text-gray-600 dark:tw-text-gray-300 tw-justify-between tw-flex tw-gap-2">
          <div className="tw-text-gray-800 dark:tw-text-gray-200">
            Tasks
          </div>
          <div className="tw-text-gray-600 dark:tw-text-gray-400">
            Oct, 1, 2025
          </div>
        </div>
        <h3 className="tw-mt-1 tw-font-medium tw-text-xl max-md:tw-text-xl">
          Plan and Track Work: List, Kanban, and Calendar Views
        </h3>
      </a>
    </div>
  </section>
  );
}
