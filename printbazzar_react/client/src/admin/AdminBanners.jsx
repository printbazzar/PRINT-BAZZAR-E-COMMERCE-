import React, { useState, useEffect } from 'react';
import { Button, TextInput, Modal, Spinner } from 'flowbite-react';
import { HiPlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';
import { api } from '../services/api';
import AdminMediaUploader from '../Components/AdminMediaUploader';

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    desktopImageUrl: '',
    mobileImageUrl: '',
    buttonText: 'Shop Now',
    buttonUrl: '/shop',
    displayOrder: 1,
    isActive: true,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminBanners();
      if (res.success) {
        setBanners(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching banners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      desktopImageUrl: '',
      mobileImageUrl: '',
      buttonText: 'Shop Now',
      buttonUrl: '/shop',
      displayOrder: banners.length + 1,
      isActive: true,
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (b) => {
    setEditingBanner(b);
    setFormData({
      title: b.title,
      subtitle: b.subtitle || '',
      desktopImageUrl: b.desktopImageUrl,
      mobileImageUrl: b.mobileImageUrl || '',
      buttonText: b.buttonText || 'Shop Now',
      buttonUrl: b.buttonUrl || '/shop',
      displayOrder: b.displayOrder || 1,
      isActive: b.isActive !== false,
    });
    setOpenModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await api.updateBanner(editingBanner.id, formData);
      } else {
        await api.createBanner(formData);
      }
      setOpenModal(false);
      fetchBanners();
    } catch (err) {
      alert(err.message || 'Failed to save banner');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this banner slide?')) return;
    try {
      await api.deleteBanner(id);
      fetchBanners();
    } catch (err) {
      alert(err.message || 'Failed to delete banner');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Homepage Banners CMS</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage desktop & mobile promo sliders</p>
        </div>
        <Button
          onClick={handleOpenAdd}
          color="dark"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs"
        >
          <HiPlus className="w-4 h-4 mr-1" /> Add New Banner
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : banners.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-gray-500 text-sm">
            No banners found.
          </div>
        ) : (
          banners.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <img
                  src={b.desktopImageUrl}
                  alt={b.title}
                  className="w-full h-44 object-cover border-b"
                />
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 text-base">{b.title}</h3>
                    <span className="text-[10px] font-extrabold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      Order: {b.displayOrder}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{b.subtitle}</p>
                  <p className="text-[11px] text-blue-600 mt-2">Target Link: {b.buttonUrl}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    b.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 text-blue-600 bg-white border hover:bg-blue-50 rounded"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 text-red-600 bg-white border hover:bg-red-50 rounded"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal show={openModal} onClose={() => setOpenModal(false)}>
        <Modal.Header>{editingBanner ? 'Edit Banner' : 'Add Banner'}</Modal.Header>
        <form onSubmit={handleSave}>
          <Modal.Body className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Banner Title *</label>
              <TextInput
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Subtitle</label>
              <TextInput
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              />
            </div>
            <AdminMediaUploader
              label="Desktop Hero Banner Image"
              value={formData.desktopImageUrl}
              onChange={(url) => setFormData({ ...formData, desktopImageUrl: url })}
              aspectHint="Wide hero aspect ratio (1920x600 px recommended)"
              required
            />

            <AdminMediaUploader
              label="Mobile Banner Image (Optional)"
              value={formData.mobileImageUrl}
              onChange={(url) => setFormData({ ...formData, mobileImageUrl: url })}
              aspectHint="Square or portrait aspect ratio (800x800 px recommended for mobile screens)"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Button Text</label>
                <TextInput
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Target URL</label>
                <TextInput
                  value={formData.buttonUrl}
                  onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" color="dark" className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs">
              Save Banner
            </Button>
            <Button color="light" onClick={() => setOpenModal(false)} className="text-xs">
              Cancel
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
