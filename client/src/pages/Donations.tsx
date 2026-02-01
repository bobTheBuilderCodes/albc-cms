import { useState, useEffect } from 'react';
import type { Donation, Member } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { initializeMockData, addAuditLog } from '../utils/mockData';
import { downloadReceipt, DonationReceipt } from '../components/DonationReceipt';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Download,
  TrendingUp,
  PieChart,
  Calendar,
  X,
  FileText,
  Printer,
  Eye
} from 'lucide-react';

export function Donations() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'tithe' | 'offering' | 'seed' | 'special' | 'other'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Donation | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    initializeMockData();
    loadData();
  }, []);

  const loadData = () => {
    setDonations(JSON.parse(localStorage.getItem('cms_donations') || '[]'));
    setMembers(JSON.parse(localStorage.getItem('cms_members') || '[]'));
  };

  const filteredDonations = donations.filter(d => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (searchQuery && !d.memberName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalAmount = filteredDonations.reduce((sum, d) => sum + d.amount, 0);
  const totalTithes = donations.filter(d => d.type === 'tithe').reduce((sum, d) => sum + d.amount, 0);
  const totalOfferings = donations.filter(d => d.type === 'offering').reduce((sum, d) => sum + d.amount, 0);
  const totalSeeds = donations.filter(d => d.type === 'seed').reduce((sum, d) => sum + d.amount, 0);

  const exportDonations = () => {
    const headers = ['Date', 'Member', 'Type', 'Amount', 'Payment Method', 'Receipt'];
    const rows = filteredDonations.map(d => [
      new Date(d.date).toLocaleDateString(),
      d.memberName,
      d.type,
      d.amount,
      d.paymentMethod,
      d.receiptNumber || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-neutral-900 mb-2">Donations & Finance</h1>
            <p className="text-neutral-600">Track tithes, offerings, and donations</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 from-primary-600 to-accent-600 text-white rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Record Donation
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-success-500 to-success-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-3xl mb-1">GH₵ {totalAmount.toLocaleString()}</p>
            <p className="text-sm text-white/80">Total (Filtered)</p>
          </div>

          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-3xl mb-1">GH₵ {totalTithes.toLocaleString()}</p>
            <p className="text-sm text-white/80">Tithes</p>
          </div>

          <div className="bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <PieChart className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-3xl mb-1">GH₵ {totalOfferings.toLocaleString()}</p>
            <p className="text-sm text-white/80">Offerings</p>
          </div>

          <div className="bg-gradient-to-br from-info-500 to-info-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-white/80" />
            </div>
            <p className="text-3xl mb-1">GH₵ {totalSeeds.toLocaleString()}</p>
            <p className="text-sm text-white/80">Seeds</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by member name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            <option value="tithe">Tithe</option>
            <option value="offering">Offering</option>
            <option value="seed">Seed</option>
            <option value="special">Special</option>
            <option value="other">Other</option>
          </select>

          <button
            onClick={exportDonations}
            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Date</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Member</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Type</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Amount</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Payment Method</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Receipt #</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Recorded By</th>
                <th className="text-left px-6 py-3 text-sm text-neutral-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredDonations.map((donation) => (
                <tr key={donation.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-neutral-700">
                    {new Date(donation.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-900">
                    {donation.memberName}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-primary-50 text-primary-700 capitalize">
                      {donation.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-success-600">
                    GH₵ {donation.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-700 capitalize">
                    {donation.paymentMethod.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {donation.receiptNumber || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-600">
                    {donation.recordedBy}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingReceipt(donation)}
                        className="p-1.5 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors"
                        title="View Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => downloadReceipt(donation)}
                        className="p-1.5 hover:bg-success-50 text-success-600 rounded-lg transition-colors"
                        title="Download Receipt"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDonations.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">No donations found</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <DonationModal
          members={members}
          onClose={() => setShowAddModal(false)}
          onSave={(donation) => {
            const newDonation = {
              ...donation,
              id: `donation-${Date.now()}`,
              recordedBy: user!.name,
              createdAt: new Date().toISOString(),
            };
            const updated = [...donations, newDonation];
            setDonations(updated);
            localStorage.setItem('cms_donations', JSON.stringify(updated));

            addAuditLog({
              id: Date.now().toString(),
              userId: user!.id,
              userName: user!.name,
              userRole: user!.role,
              action: 'donation_recorded',
              resourceType: 'donation',
              resourceId: newDonation.id,
              details: `Recorded donation of GH₵${donation.amount} from ${donation.memberName}`,
              timestamp: new Date().toISOString(),
            });

            setShowAddModal(false);
          }}
        />
      )}

      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-neutral-900 font-semibold">Donation Receipt</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadReceipt(viewingReceipt)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download/Print
                </button>
                <button onClick={() => setViewingReceipt(null)} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              <DonationReceipt donation={viewingReceipt} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DonationModal({ 
  members, 
  onClose, 
  onSave 
}: { 
  members: Member[]; 
  onClose: () => void; 
  onSave: (donation: Partial<Donation>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Donation>>({
    memberName: 'Anonymous',
    amount: 0,
    currency: 'GHS',
    type: 'offering',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    description: '',
  });
  const [generateReceipt, setGenerateReceipt] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate receipt number if not provided and receipt generation is enabled
    let donationData = { ...formData };
    if (generateReceipt && !donationData.receiptNumber) {
      donationData.receiptNumber = `RCP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    }
    
    onSave(donationData);
    
    // Generate and download receipt if enabled
    if (generateReceipt) {
      setTimeout(() => {
        const settings = JSON.parse(localStorage.getItem('cms_settings') || JSON.stringify({
          churchName: 'Grace Church',
          email: 'info@gracechurch.com',
          phone: '+233 24 123 4567',
          address: '123 Church Street, Accra, Ghana',
        }));
        
        const fullDonation: Donation = {
          ...donationData,
          id: `donation-${Date.now()}`,
          recordedBy: 'System',
          createdAt: new Date().toISOString(),
        } as Donation;
        
        downloadReceipt(fullDonation, settings);
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-neutral-900">Record Donation</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-neutral-700 mb-2">Member (Optional)</label>
              <select
                value={formData.memberId || ''}
                onChange={(e) => {
                  const member = members.find(m => m.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    memberId: e.target.value || undefined,
                    memberName: member?.fullName || 'Anonymous'
                  });
                }}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Anonymous</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="tithe">Tithe</option>
                <option value="offering">Offering</option>
                <option value="seed">Seed</option>
                <option value="special">Special</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">Amount (GH₵) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-700 mb-2">Payment Method *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="check">Check</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-neutral-700 mb-2">Receipt Number</label>
              <input
                type="text"
                value={formData.receiptNumber || ''}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., RCP-2026-001"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-neutral-700 mb-2">Description / Notes</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>

            {/* Receipt Generation Checkbox */}
            <div className="col-span-2">
              <div className="flex items-start gap-3 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                <input
                  type="checkbox"
                  id="generateReceipt"
                  checked={generateReceipt}
                  onChange={(e) => setGenerateReceipt(e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <label htmlFor="generateReceipt" className="flex items-center gap-2 text-sm text-neutral-900 font-semibold cursor-pointer">
                    <Printer className="w-4 h-4 text-primary-600" />
                    Generate and Download Receipt
                  </label>
                  <p className="text-xs text-neutral-600 mt-1">
                    Automatically generate an official receipt that can be printed or saved. 
                    {!formData.receiptNumber && generateReceipt && ' A receipt number will be auto-generated.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-900 from-primary-600 to-accent-600 text-white py-2 rounded-lg hover:from-primary-700 hover:to-accent-700 transition-all font-semibold"
            >
              Record Donation
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-100 text-neutral-700 py-2 rounded-lg hover:bg-neutral-200 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}