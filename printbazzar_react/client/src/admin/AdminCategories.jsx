import React, { useState, useEffect } from 'react';
import { Button, TextInput, Textarea, Modal, Spinner } from 'flowbite-react';
import { HiPlus, HiOutlinePencil, HiOutlineTrash, HiOutlinePhotograph } from 'react-icons/hi';
import { api } from '../services/api';
import AdminMediaUploader from '../Components/AdminMediaUploader';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    bannerUrl: '',
    displayOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminCategories();
      if (res.success) {
        setCategories(res.data || []);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      bannerUrl: '',
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      bannerUrl: cat.bannerUrl || '',
      displayOrder: cat.displayOrder || 0,
      isActive: cat.isActive !== false,
    });
    setOpenModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, formData);
      } else {
        await api.createCategory(formData);
      }
      setOpenModal(false);
      fetchCategories();
    } catch (err) {
      alert(err.message || 'Failed to save category');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;
    try {
      await api.deleteCategory(id);
      fetchCategories();
    } catch (err) {
      alert(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-4 border-b">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Category CMS</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage catalogue hierarchy and banners</p>
        </div>
        <Button
          onClick={handleOpenAdd}
          color="dark"
          className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs"
        >
          <HiPlus className="w-4 h-4 mr-1" /> Add Category
        </Button>
      </div>

      <div className="bg-white rounded-2xl border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-gray-700">
              <thead className="bg-gray-50 uppercase text-[10px] text-gray-400 border-b">
                <tr>
                  <th className="p-3">Order</th>
                  <th className="p-3">Image</th>
                  <th className="p-3">Category Name</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3">Products</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-400">{cat.displayOrder}</td>
                    <td className="p-3">
                      <img
                        src={cat.imageUrl || '/default-image.png'}
                        alt={cat.name}
                        className="w-10 h-10 object-cover rounded-lg border"
                      />
                    </td>
                    <td className="p-3 font-bold text-gray-900">{cat.name}</td>
                    <td className="p-3 font-mono text-gray-500">{cat.slug}</td>
                    <td className="p-3 font-semibold text-gray-800">{cat._count?.products || 0}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          cat.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                          title="Edit"
                        >
                          <HiOutlinePencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded"
                          title="Delete"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Add / Edit Category */}
      <Modal show={openModal} onClose={() => setOpenModal(false)}>
        <Modal.Header>{editingCategory ? 'Edit Category' : 'Add New Category'}</Modal.Header>
        <form onSubmit={handleSave}>
          <Modal.Body className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Category Name *</label>
              <TextInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Luxury Business Cards"
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Slug</label>
              <TextInput
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="luxury-business-cards"
              />
            </div>

            <AdminMediaUploader
              label="Category Thumbnail Image"
              value={formData.imageUrl}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              aspectHint="Square ratio recommended (e.g. 500x500 px)"
              required
            />

            <AdminMediaUploader
              label="Category Header Banner (Optional)"
              value={formData.bannerUrl}
              onChange={(url) => setFormData({ ...formData, bannerUrl: url })}
              aspectHint="Wide banner ratio (e.g. 1920x400 px)"
            />

            <div>
              <label className="font-bold text-gray-700 block mb-1">Display Order</label>
              <TextInput
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="submit" color="dark" className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs">
              Save Category
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
