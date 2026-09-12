import React, { useState, useEffect } from 'react';
import { Button, Table, Badge, Modal, TextInput, Label, Select, Alert, Spinner } from 'flowbite-react';
import {
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePencil,
  HiOutlineKey,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { api } from '../services/api';

export default function AdminStaffManagement() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('PRODUCTION');

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await api.getStaffList();
      if (res.success) {
        setStaffList(res.data);
      }
    } catch (err) {
      setError('Failed to fetch staff members: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPassword('Staff@123');
    setDepartment('PRODUCTION');
    setModalOpen(true);
  };

  const handleOpenEditModal = (staff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setEmail(staff.email);
    setPassword('');
    setDepartment(staff.department || 'PRODUCTION');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        const res = await api.updateStaff(editingStaff.id, {
          name,
          department,
          ...(password ? { password } : {}),
        });
        if (res.success) {
          setSuccessMsg(res.message);
          setModalOpen(false);
          loadStaff();
        }
      } else {
        const res = await api.createStaff({
          name,
          email,
          password,
          department,
        });
        if (res.success) {
          setSuccessMsg(res.message);
          setModalOpen(false);
          loadStaff();
        }
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${name}"?`)) return;
    try {
      const res = await api.deleteStaff(id);
      if (res.success) {
        setSuccessMsg(res.message);
        loadStaff();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const getDeptColor = (dept) => {
    switch (dept) {
      case 'DESIGN': return 'purple';
      case 'PRODUCTION': return 'blue';
      case 'FINISHING_QC': return 'indigo';
      case 'PACKING': return 'yellow';
      case 'DELIVERY': return 'green';
      case 'ALL': return 'dark';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-yellow-800 bg-yellow-100 px-2.5 py-0.5 rounded-full">
              ERP IN-HOUSE RBAC
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mt-1">In-House Department Staff Credentials</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage department-specific staff logins for Prepress Design, Offset Press, Finishing QC, Packing, and Delivery.
          </p>
        </div>

        <Button
          color="dark"
          onClick={handleOpenCreateModal}
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs rounded-xl shadow-xs"
        >
          <HiOutlinePlus className="w-4 h-4 mr-1.5" />
          Provision New Staff Member
        </Button>
      </div>

      {successMsg && (
        <Alert color="success" className="text-xs font-bold">
          ✔ {successMsg}
        </Alert>
      )}

      {error && (
        <Alert color="failure" className="text-xs font-bold">
          {error}
        </Alert>
      )}

      {/* Staff Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <Table hoverable>
          <Table.Head className="bg-gray-50 text-[11px] font-extrabold uppercase text-gray-700">
            <Table.HeadCell>Staff Member</Table.HeadCell>
            <Table.HeadCell>Assigned Department</Table.HeadCell>
            <Table.HeadCell>System Role</Table.HeadCell>
            <Table.HeadCell>Account Status</Table.HeadCell>
            <Table.HeadCell>Last Active</Table.HeadCell>
            <Table.HeadCell className="text-right">Actions</Table.HeadCell>
          </Table.Head>

          <Table.Body className="divide-y text-xs">
            {loading ? (
              <Table.Row>
                <Table.Cell colSpan={6} className="text-center py-8">
                  <Spinner size="md" />
                  <span className="block text-xs font-bold text-gray-400 mt-2">Loading Staff Directory...</span>
                </Table.Cell>
              </Table.Row>
            ) : staffList.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={6} className="text-center py-8 text-gray-400">
                  No staff accounts provisioned yet.
                </Table.Cell>
              </Table.Row>
            ) : (
              staffList.map((staff) => (
                <Table.Row key={staff.id} className="bg-white">
                  <Table.Cell className="font-extrabold text-gray-900">
                    <div>
                      <span>{staff.name}</span>
                      <span className="block text-[11px] text-gray-400 font-normal">{staff.email}</span>
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <Badge color={getDeptColor(staff.department)} size="xs" className="font-black">
                      {staff.department} DEPT
                    </Badge>
                  </Table.Cell>

                  <Table.Cell className="font-mono text-gray-600 text-[11px]">
                    {staff.role?.name || 'STAFF'}
                  </Table.Cell>

                  <Table.Cell>
                    {staff.isActive ? (
                      <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-bold">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-bold">
                        Disabled
                      </span>
                    )}
                  </Table.Cell>

                  <Table.Cell className="text-[11px] text-gray-400">
                    {staff.lastLoginAt ? new Date(staff.lastLoginAt).toLocaleString('en-IN') : 'Never'}
                  </Table.Cell>

                  <Table.Cell className="text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(staff)}
                      className="text-gray-600 hover:text-black font-bold text-xs p-1"
                      title="Edit Department or Reset Password"
                    >
                      <HiOutlinePencil className="w-4 h-4 inline" />
                    </button>
                    {staff.email !== 'admin@printbazzar.online' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(staff.id, staff.name)}
                        className="text-red-600 hover:text-red-800 font-bold text-xs p-1"
                        title="Delete Staff"
                      >
                        <HiOutlineTrash className="w-4 h-4 inline" />
                      </button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>

      {/* Quick Credentials Info Box for Staff */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-xs text-gray-700 space-y-3">
        <h3 className="font-black text-gray-900 flex items-center gap-2">
          <HiOutlineKey className="w-4 h-4 text-yellow-600" /> Default Department Login Credentials:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-white border rounded-xl">
            <strong className="block text-purple-700">🎨 Prepress Design Lead</strong>
            <span className="block text-[11px] text-gray-600">Email: design@printbazzar.online</span>
            <span className="block text-[11px] font-mono font-bold">Pass: Staff@123</span>
          </div>
          <div className="p-3 bg-white border rounded-xl">
            <strong className="block text-blue-700">🖨️ Offset & Digital Press Master</strong>
            <span className="block text-[11px] text-gray-600">Email: press@printbazzar.online</span>
            <span className="block text-[11px] font-mono font-bold">Pass: Staff@123</span>
          </div>
          <div className="p-3 bg-white border rounded-xl">
            <strong className="block text-yellow-700">📦 Packaging & Dispatch Desk</strong>
            <span className="block text-[11px] text-gray-600">Email: packing@printbazzar.online</span>
            <span className="block text-[11px] font-mono font-bold">Pass: Staff@123</span>
          </div>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      <Modal show={modalOpen} onClose={() => setModalOpen(false)}>
        <Modal.Header>
          {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Provision New Department Staff Member'}
        </Modal.Header>
        <form onSubmit={handleSubmit}>
          <Modal.Body className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">Staff Member Name *</Label>
              <TextInput
                placeholder="e.g. Anand (Offset Master)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                sizing="sm"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">Official Login Email *</Label>
              <TextInput
                type="email"
                placeholder="e.g. anand.press@printbazzar.online"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!editingStaff}
                disabled={!!editingStaff}
                sizing="sm"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                Assigned In-House Department *
              </Label>
              <Select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                sizing="sm"
              >
                <option value="DESIGN">🎨 DESIGN (Prepress & Artwork Hub)</option>
                <option value="PRODUCTION">🖨️ PRODUCTION (Offset & Digital Press)</option>
                <option value="FINISHING_QC">✂️ FINISHING_QC (Lamination, Cutting & QC)</option>
                <option value="PACKING">📦 PACKING (Packaging & Dispatch Desk)</option>
                <option value="DELIVERY">🚚 DELIVERY (Local Courier & Logistics)</option>
                <option value="MANAGEMENT">🧭 MANAGEMENT (Manager / Admin — Broad Oversight)</option>
                <option value="SALES">💼 SALES (Customers, Orders & Quotations)</option>
                <option value="ACCOUNTS">🧾 ACCOUNTS (Payments, Invoices & Reports)</option>
                <option value="DISPATCH">🚀 DISPATCH (Order Status & Delivery Coordination)</option>
                <option value="ALL">👑 ALL (Super Admin / Management)</option>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700 block mb-1">
                {editingStaff ? 'New Password (Leave blank to keep current)' : 'Initial Password *'}
              </Label>
              <TextInput
                type="password"
                placeholder={editingStaff ? '••••••••' : 'Staff@123'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editingStaff}
                sizing="sm"
              />
            </div>
          </Modal.Body>
          <Modal.Footer className="flex justify-between">
            <Button color="light" size="xs" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" color="dark" size="xs" className="bg-yellow-400 hover:bg-yellow-500 text-black font-black">
              {editingStaff ? 'Update Staff Member ➔' : 'Save Staff Account ➔'}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
