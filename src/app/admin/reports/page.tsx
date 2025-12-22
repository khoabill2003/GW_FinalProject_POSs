export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500">
          Sales reports and analytics will be displayed here. Connect to a
          database to generate real reports.
        </p>

        {/* Sample Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Daily Report</h3>
            <p className="text-sm text-gray-500">
              View detailed daily sales and order statistics.
            </p>
            <button className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
              Generate
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Weekly Report</h3>
            <p className="text-sm text-gray-500">
              Analyze weekly trends and performance.
            </p>
            <button className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
              Generate
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Monthly Report</h3>
            <p className="text-sm text-gray-500">
              Comprehensive monthly business overview.
            </p>
            <button className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
              Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
