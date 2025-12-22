export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-200">
        {/* Restaurant Info */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Restaurant Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Name
              </label>
              <input
                type="text"
                defaultValue="My Restaurant"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                defaultValue="123 Main Street"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="text"
                defaultValue="(555) 123-4567"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tax Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                defaultValue="8"
                className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Receipt Settings */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Receipt Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Print Receipt</p>
                <p className="text-sm text-gray-500">
                  Automatically print receipt after order
                </p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600">
                <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email Receipt</p>
                <p className="text-sm text-gray-500">
                  Send receipt to customer email
                </p>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition" />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="p-6">
          <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
