export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Heading */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-500">Overview of your flight school operations</p>
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow border p-6 flex flex-col items-start">
          <span className="text-gray-500 text-sm mb-2">Total Bookings</span>
          <span className="text-3xl font-bold text-violet-700">124</span>
        </div>
        <div className="bg-white rounded-xl shadow border p-6 flex flex-col items-start">
          <span className="text-gray-500 text-sm mb-2">Active Members</span>
          <span className="text-3xl font-bold text-green-600">87</span>
        </div>
        <div className="bg-white rounded-xl shadow border p-6 flex flex-col items-start">
          <span className="text-gray-500 text-sm mb-2">Aircraft Available</span>
          <span className="text-3xl font-bold text-violet-500">12</span>
        </div>
        <div className="bg-white rounded-xl shadow border p-6 flex flex-col items-start">
          <span className="text-gray-500 text-sm mb-2">Pending Invoices</span>
          <span className="text-3xl font-bold text-orange-500">23</span>
        </div>
      </div>
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow border p-6 col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Recent Activity</h2>
          <p className="text-gray-500 mb-4">Latest updates from your flight school</p>
          <ul className="space-y-4">
            <li>
              <div className="font-semibold text-gray-900">Flight booking created</div>
              <div className="text-gray-500 text-sm">by John Smith &middot; 2 hours ago</div>
            </li>
            <li>
              <div className="font-semibold text-gray-900">Member added</div>
              <div className="text-gray-500 text-sm">by Sarah Johnson &middot; 4 hours ago</div>
            </li>
            <li>
              <div className="font-semibold text-gray-900">Training session completed</div>
              <div className="text-gray-500 text-sm">by Mike Wilson &middot; 1 day ago</div>
            </li>
            <li>
              <div className="font-semibold text-gray-900">Invoice generated</div>
              <div className="text-gray-500 text-sm">by Lisa Brown &middot; 2 days ago</div>
            </li>
          </ul>
        </div>
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow border p-6 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Quick Actions</h2>
          <p className="text-gray-500 mb-4">Common tasks and shortcuts</p>
          <div className="grid grid-cols-1 gap-3">
            <button className="w-full bg-violet-50 border border-violet-200 text-violet-700 font-semibold rounded-lg py-3 hover:bg-violet-100 transition">New Booking</button>
            <button className="w-full bg-violet-50 border border-violet-200 text-violet-700 font-semibold rounded-lg py-3 hover:bg-violet-100 transition">Add Member</button>
            <button className="w-full bg-orange-50 border border-orange-200 text-orange-600 font-semibold rounded-lg py-3 hover:bg-orange-100 transition">Create Invoice</button>
            <button className="w-full bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-lg py-3 hover:bg-gray-100 transition">Safety Report</button>
          </div>
        </div>
      </div>
    </div>
  );
} 