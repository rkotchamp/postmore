import PlatformSelector from "@/app/dashboard/create-post/components/PlatformSelector";
import MediaUploader from "@/app/dashboard/create-post/components/MediaUploader";
import ScheduleToggle from "@/app/dashboard/create-post/components/ScheduleToggle";

export default function CreatePost() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Create Post</h2>

      <div className="bg-white p-6 rounded shadow mb-6">
        <form>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Content
            </label>
            <textarea
              className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows="4"
              placeholder="What would you like to share?"
            ></textarea>
          </div>

          <div className="mb-6">
            <MediaUploader />
          </div>

          <div className="mb-6">
            <PlatformSelector />
          </div>

          <div className="mb-6">
            <ScheduleToggle />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
