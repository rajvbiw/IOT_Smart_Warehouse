import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWarehouse } from '../context/WarehouseContext';
import { useAuth } from '../context/AuthContext';
import { AssetValuationChart, CategorySummaryChart } from '../components/charts/SensorChart';
import { Package, HelpCircle, Shuffle, ShieldAlert, FileDown, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Asset {
  id: number;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock_level: number;
  max_stock_level: number;
  unit_price: number;
  zone_id: number;
  zone?: {
    name: string;
  };
}

interface Movement {
  id: number;
  quantity: number;
  movement_type: string;
  reference_no: string;
  notes: string | null;
  created_at: string;
  asset?: {
    name: string;
    sku: string;
  };
  operator?: {
    name: string;
  };
}

export const Assets: React.FC = () => {
  const { selectedWarehouseId } = useWarehouse();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'valuation'>('inventory');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [valuation, setValuation] = useState<{ total: number; byZone: any[]; byCategory: any[] } | null>(null);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Movement Modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [moveType, setMoveType] = useState('inbound');
  const [moveQty, setMoveQty] = useState('10');
  const [moveRef, setMoveRef] = useState('');
  const [moveNotes, setMoveNotes] = useState('');
  const [zones, setZones] = useState<any[]>([]);
  const [toZoneId, setToZoneId] = useState('');

  const fetchAssetData = async () => {
    if (!token || !selectedWarehouseId) return;
    try {
      // Fetch assets
      const assetsRes = await axios.get(`/api/assets?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssets(assetsRes.data);

      // Fetch movements logs
      const movRes = await axios.get(`/api/assets/movements?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMovements(movRes.data);

      // Fetch valuation totals
      const valRes = await axios.get(`/api/assets/valuation?warehouse_id=${selectedWarehouseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setValuation(valRes.data);

      // Fetch zones for movement dropdowns
      const zoneRes = await axios.get(`/api/warehouses/${selectedWarehouseId}/zones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setZones(zoneRes.data);
    } catch (err) {
      console.error('Failed to load asset details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetData();
  }, [token, selectedWarehouseId]);

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !token) return;

    const selectedAsset = assets.find(a => a.id === parseInt(selectedAssetId, 10));
    if (!selectedAsset) return;

    try {
      await axios.post(
        `/api/assets/${selectedAssetId}/movement`,
        {
          movement_type: moveType,
          quantity: parseFloat(moveQty),
          from_zone_id: moveType === 'transfer' ? selectedAsset.zone_id : null,
          to_zone_id: moveType === 'transfer' ? parseInt(toZoneId, 10) : selectedAsset.zone_id,
          reference_no: moveRef || `MOV-${Date.now()}`,
          notes: moveNotes,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Inventory stock movement recorded.');
      setShowMoveModal(false);
      setSelectedAssetId('');
      setMoveNotes('');
      setMoveRef('');
      fetchAssetData();
    } catch (err: any) {
      console.error('Movement creation failed:', err);
      toast.error(err.response?.data?.error || 'Failed to submit movement record.');
    }
  };

  const downloadInventoryCsv = () => {
    let csvContent = 'SKU,Name,Category,Quantity,Unit,Unit Price,Valuation,Status\n';
    assets.forEach((asset) => {
      const val = Number(asset.quantity) * Number(asset.unit_price);
      const status = getAssetStatus(asset).label;
      csvContent += `"${asset.sku}","${asset.name}","${asset.category}",${asset.quantity},"${asset.unit}",$${asset.unit_price},$${val.toFixed(2)},"${status}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warehouse_${selectedWarehouseId}_inventory.csv`;
    a.click();
  };

  const getAssetStatus = (asset: Asset) => {
    const qty = Number(asset.quantity);
    const min = Number(asset.min_stock_level);
    if (qty < min) {
      return { label: 'Critical', bg: 'bg-red-500/10 text-red-400 border-red-500/20' };
    }
    if (qty < min * 1.5) {
      return { label: 'Low Stock', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    }
    return { label: 'OK', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  };

  // Unique categories for filtering
  const categories = Array.from(new Set(assets.map((a) => a.category)));

  // Filtered Assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory ? asset.category === selectedCategory : true;
    return matchesSearch && matchesCat;
  });

  const lowStockCount = assets.filter((a) => Number(a.quantity) < Number(a.min_stock_level)).length;

  if (isLoading) {
    return (
      <div className="h-96 bg-slate-800 border border-slate-700 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-slate-400 text-sm font-medium">Loading inventory lists...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Low Stock Warning Banner */}
      {lowStockCount > 0 && (
        <div className="bg-red-950/60 border border-red-900 rounded-xl p-4 flex items-center gap-3 text-red-400 text-xs shadow-inner">
          <ShieldAlert className="w-5 h-5 text-red-400 animate-bounce" />
          <div>
            <span className="font-bold uppercase tracking-wider block text-[10px]">Stock Shortage Violation Alert</span>
            <span className="text-red-300 font-medium">
              There are {lowStockCount} items in this warehouse currently running below their minimum stock thresholds.
            </span>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Assets & Inventory</h2>
          <p className="text-xs text-slate-400">Track item locations, valuations, and movements history</p>
        </div>

        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setShowMoveModal(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center gap-1.5"
          >
            <Shuffle className="w-4 h-4" /> Record Movement
          </button>
          <button
            onClick={downloadInventoryCsv}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center gap-1.5"
          >
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50 text-xs">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'inventory' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Inventory List ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'movements' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Stock Movements ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab('valuation')}
          className={`pb-3 px-6 font-semibold border-b-2 transition-all ${
            activeTab === 'valuation' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Inventory Valuation
        </button>
      </div>

      {/* Tab contents */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search by SKU or item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none flex-1 focus:border-blue-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="py-2.5">SKU</th>
                  <th className="py-2.5">Name</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Zone Location</th>
                  <th className="py-2.5">Quantity</th>
                  <th className="py-2.5">Unit Price</th>
                  <th className="py-2.5">Valuation</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset) => {
                  const status = getAssetStatus(asset);
                  const val = Number(asset.quantity) * Number(asset.unit_price);
                  return (
                    <tr key={asset.id} className="border-b border-slate-700/30 hover:bg-slate-700/10">
                      <td className="py-3 font-mono font-medium text-slate-400">{asset.sku}</td>
                      <td className="py-3 text-slate-200 font-semibold">{asset.name}</td>
                      <td className="py-3 text-slate-400">{asset.category}</td>
                      <td className="py-3 text-slate-400">{asset.zone ? asset.zone.name : 'Unknown'}</td>
                      <td className="py-3 text-slate-200 font-bold">
                        {asset.quantity} {asset.unit}
                      </td>
                      <td className="py-3 text-slate-400">${Number(asset.unit_price).toFixed(2)}</td>
                      <td className="py-3 text-slate-200 font-extrabold">${val.toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${status.bg}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm overflow-x-auto">
          {movements.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">No stock movements recorded yet.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="py-2.5">Reference No</th>
                  <th className="py-2.5">Asset SKU</th>
                  <th className="py-2.5">Item Name</th>
                  <th className="py-2.5">Action Type</th>
                  <th className="py-2.5">Quantity</th>
                  <th className="py-2.5">Operator</th>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((mov) => (
                  <tr key={mov.id} className="border-b border-slate-700/30 hover:bg-slate-700/10">
                    <td className="py-3 font-mono text-slate-300">{mov.reference_no}</td>
                    <td className="py-3 font-mono text-slate-500">{mov.asset?.sku || '--'}</td>
                    <td className="py-3 text-slate-200 font-medium">{mov.asset?.name || 'Unknown Item'}</td>
                    <td className="py-3 capitalize">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        mov.movement_type === 'inbound' ? 'bg-emerald-500/10 text-emerald-400' :
                        mov.movement_type === 'outbound' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {mov.movement_type}
                      </span>
                    </td>
                    <td className="py-3 text-slate-200 font-bold">{mov.quantity}</td>
                    <td className="py-3 text-slate-400">{mov.operator?.name || 'Operator'}</td>
                    <td className="py-3 text-slate-400">{new Date(mov.created_at).toLocaleString()}</td>
                    <td className="py-3 text-slate-500 italic max-w-xs truncate">{mov.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'valuation' && valuation && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-center items-center">
            <Package className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Inventory Assets Value</h3>
            <div className="text-3xl font-black text-white mt-2">${valuation.total.toLocaleString()}</div>
            <p className="text-[10px] text-slate-500 mt-1">Calculated via live quantity and unit prices</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Valuation By Zone Layout</h3>
            <AssetValuationChart data={valuation.byZone} />
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Valuation By Categories</h3>
            <CategorySummaryChart data={valuation.byCategory} />
          </div>
        </div>
      )}

      {/* Record Movement Modal Form */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full relative">
            <h3 className="text-md font-bold text-white mb-4">Record Stock Movement</h3>
            
            <form onSubmit={handleMovementSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5">Select Asset Product</label>
                <select
                  required
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                >
                  <option value="">-- Choose Asset SKU --</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.sku}) - Qty: {asset.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1.5">Action Type</label>
                  <select
                    value={moveType}
                    onChange={(e) => setMoveType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  >
                    <option value="inbound">Inbound (Receive)</option>
                    <option value="outbound">Outbound (Issue)</option>
                    <option value="transfer">Zone Transfer</option>
                    <option value="adjustment">Stock Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    required
                    value={moveQty}
                    onChange={(e) => setMoveQty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  />
                </div>
              </div>

              {moveType === 'transfer' && (
                <div>
                  <label className="block text-slate-400 mb-1.5">Destination Zone</label>
                  <select
                    required
                    value={toZoneId}
                    onChange={(e) => setToZoneId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none"
                  >
                    <option value="">-- Choose Zone --</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.zone_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1.5">Reference Document No</label>
                <input
                  type="text"
                  value={moveRef}
                  onChange={(e) => setMoveRef(e.target.value)}
                  placeholder="e.g. PO-892182"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Movement Details Notes</label>
                <textarea
                  rows={2}
                  value={moveNotes}
                  onChange={(e) => setMoveNotes(e.target.value)}
                  placeholder="Reason for adjustment, details on recipient, etc."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 outline-none placeholder-slate-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowMoveModal(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-md"
                >
                  Submit Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Assets;
