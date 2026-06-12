import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { FileText, Printer, FileDown, Plus, HelpCircle, FileClock } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Report {
  id: number;
  report_type: string;
  generated_by: number;
  parameters_json: any;
  s3_file_url: string;
  created_at: string;
}

interface PreviewData {
  date: string;
  device_status: { online: number; offline: number };
  alert_count: number;
  movement_count: number;
  alerts_list: any[];
  movements_list: any[];
}

export const Reports: React.FC = () => {
  const { selectedWarehouseId } = useWarehouse();
  const { token } = useAuth();

  const [reports, setReports] = useState<Report[]>([]);
  const [reportType, setReportType] = useState('Daily Summary');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingList, setIsFetchingList] = useState(true);

  const fetchReports = async () => {
    if (!token || !selectedWarehouseId) return;
    try {
      const res = await axios.get(`/api/reports?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReports(res.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsFetchingList(false);
    }
  };

  const fetchPreview = async () => {
    if (!token || !selectedWarehouseId) return;
    try {
      const res = await axios.get(
        `/api/reports/daily?warehouse_id=${selectedWarehouseId}&date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreviewData(res.data);
    } catch (err) {
      console.error('Failed to fetch preview data:', err);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchPreview();
  }, [token, selectedWarehouseId, selectedDate]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedWarehouseId) return;

    setIsGenerating(true);
    try {
      await axios.post(
        '/api/reports/generate',
        {
          warehouse_id: selectedWarehouseId,
          report_type: reportType,
          parameters: { date: selectedDate },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Report compilation triggered successfully.');
      // Refresh list periodically
      setTimeout(() => {
        fetchReports();
        setIsGenerating(false);
      }, 2000);
    } catch (err) {
      toast.error('Failed to trigger report compilation.');
      setIsGenerating(false);
    }
  };

  const handleDownload = async (id: number) => {
    if (!token) return;
    try {
      const res = await axios.get(`/api/reports/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Direct redirect or open download link
      const win = window.open(res.data.downloadUrl, '_blank');
      if (win) win.focus();
      else window.location.href = res.data.downloadUrl;
      toast.success('Downloading report...');
    } catch (err) {
      toast.error('Download link generation failed.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-extrabold text-white">System Reports</h2>
          <p className="text-xs text-slate-400">Compile daily logs, asset distributions, and health summaries</p>
        </div>

        {previewData && (
          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2 px-4 rounded-xl transition-all text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Preview
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report parameters input */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm h-full no-print">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Generate Report</h3>

          <form onSubmit={handleGenerate} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1.5">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
              >
                <option value="Daily Summary">Daily Log Summary</option>
                <option value="Asset Report">Asset Stock Report</option>
                <option value="Device Health">Device Calibrations</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md mt-2 flex justify-center items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> {isGenerating ? 'Compiling...' : 'Generate Report'}
            </button>
          </form>

          {/* Clock lists history */}
          <div className="mt-8 border-t border-slate-700/50 pt-4">
            <h4 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-3">
              <FileClock className="w-4 h-4 text-slate-500" /> Recent Compilations
            </h4>
            
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {isFetchingList ? (
                <div className="text-[10px] text-slate-500">Syncing logs...</div>
              ) : reports.length === 0 ? (
                <div className="text-[10px] text-slate-500">No recent reports generated.</div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-slate-900/40 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-[10px]"
                  >
                    <div className="truncate max-w-[120px]">
                      <span className="font-semibold text-slate-200 block truncate">{rep.report_type}</span>
                      <span className="text-slate-500">{new Date(rep.created_at).toLocaleDateString()}</span>
                    </div>
                    {rep.s3_file_url === 'pending' ? (
                      <span className="text-amber-500 font-medium">Pending</span>
                    ) : rep.s3_file_url === 'failed' ? (
                      <span className="text-red-500 font-medium">Failed</span>
                    ) : (
                      <button
                        onClick={() => handleDownload(rep.id)}
                        className="text-blue-400 hover:text-white p-1 hover:bg-slate-800 rounded"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Live Daily Report Preview */}
        <div className="lg:col-span-3 bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm card-print">
          {previewData ? (
            <div className="space-y-6">
              <div className="border-b border-slate-700/50 pb-4 flex justify-between items-end">
                <div>
                  <h3 className="text-md font-bold text-white tracking-tight card-print">
                    Daily Log Audit Report
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Date Scope: {previewData.date}</p>
                </div>
                <div className="text-right text-[10px] text-slate-500 uppercase tracking-wider font-semibold print-only">
                  System Audit — Confirmed
                </div>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 card-print">
                  <div className="text-xl font-extrabold text-white">
                    {previewData.device_status.online} / {previewData.device_status.online + previewData.device_status.offline}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-1">Devices Active</div>
                </div>

                <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 card-print">
                  <div className="text-xl font-extrabold text-white">{previewData.alert_count}</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-1">Triggered Alerts</div>
                </div>

                <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 card-print">
                  <div className="text-xl font-extrabold text-white">{previewData.movement_count}</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-1">Stock Movements</div>
                </div>
              </div>

              {/* Alerts Log Preview list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white border-b border-slate-700/30 pb-1.5 uppercase tracking-wide">
                  Alert Violations Incidents
                </h4>
                
                {previewData.alerts_list.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-2">No alarms triggered on this day.</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/30 text-slate-400">
                        <th className="py-2">Severity</th>
                        <th className="py-2">Sensor</th>
                        <th className="py-2">Details</th>
                        <th className="py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.alerts_list.map((al: any) => (
                        <tr key={al.id} className="border-b border-slate-700/20">
                          <td className="py-2 font-bold capitalize text-red-400">{al.severity}</td>
                          <td className="py-2 text-slate-300">{al.device?.name || 'Sensor'}</td>
                          <td className="py-2 text-slate-400">{al.message}</td>
                          <td className="py-2 text-slate-400">{new Date(al.created_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Movements Log Preview list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white border-b border-slate-700/30 pb-1.5 uppercase tracking-wide">
                  Asset Transaction Logs
                </h4>
                
                {previewData.movements_list.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-2">No inventory shifts recorded.</div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/30 text-slate-400">
                        <th className="py-2">Reference</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Quantity</th>
                        <th className="py-2">Operator</th>
                        <th className="py-2">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.movements_list.map((mov: any) => (
                        <tr key={mov.id} className="border-b border-slate-700/20">
                          <td className="py-2 font-mono text-slate-300">{mov.reference_no}</td>
                          <td className="py-2 capitalize font-semibold">{mov.movement_type}</td>
                          <td className="py-2 text-slate-200 font-bold">{mov.quantity}</td>
                          <td className="py-2 text-slate-400">{mov.operator?.name || 'Operator'}</td>
                          <td className="py-2 text-slate-400">{new Date(mov.created_at).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
              No preview data available for selected parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Reports;
