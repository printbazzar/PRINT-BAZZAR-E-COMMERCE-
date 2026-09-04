import React, { useState, useEffect } from 'react';
import { Spinner } from 'flowbite-react';
import { api } from '../services/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      if (res.success) {
        setLogs(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">System Audit Trail</h1>
          <p className="text-xs text-gray-500 mt-0.5">Immutable record of administrator actions and status modifications</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            No system audit logs recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="bg-gray-50 uppercase text-[10px] text-gray-400 border-b">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Entity ID</th>
                  <th className="p-3">Admin User</th>
                  <th className="p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-gray-900">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-sans text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-sans font-semibold text-gray-800">{log.entityName}</td>
                    <td className="p-3 text-gray-500">{log.entityId ? log.entityId.slice(0, 10) + '...' : '-'}</td>
                    <td className="p-3 font-sans text-gray-900 font-semibold">{log.user?.name || log.user?.email || 'System'}</td>
                    <td className="p-3 text-gray-400">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
