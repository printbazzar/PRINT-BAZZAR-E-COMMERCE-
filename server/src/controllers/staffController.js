import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/v1/admin/staff - List all In-House Staff members
export const getStaffList = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      success: true,
      data: staff,
    });
  } catch (error) {
    console.error('Error fetching staff list:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch staff members.' });
  }
};

// POST /api/v1/admin/staff - Provision New Staff Account
export const createStaff = async (req, res) => {
  try {
    const { name, email, password, department = 'PRODUCTION', roleName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A staff member with this email already exists.' });
    }

    // Check Super Admin privilege if assigning Super Admin or department ALL
    const isTargetSuper = roleName === 'SUPER_ADMIN' || roleName === 'Super Admin' || department === 'ALL';
    const isCallerSuper = req.user?.role === 'Super Admin' || req.user?.role === 'SUPER_ADMIN';
    if (isTargetSuper && !isCallerSuper) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only an existing Super Admin can create Super Admin accounts or assign global department access.',
      });
    }

    // Resolve or fallback Role
    let role = await prisma.role.findFirst({
      where: {
        OR: [
          ...(roleName ? [{ name: roleName }] : []),
          { name: department === 'DESIGN' ? 'DESIGN_LEAD' : department === 'PRODUCTION' ? 'PRESS_OPERATOR' : department === 'FINISHING_QC' ? 'FINISHING_INSPECTOR' : department === 'PACKING' ? 'PACKING_SUPERVISOR' : department === 'DELIVERY' ? 'DELIVERY_EXECUTIVE' : 'SUPER_ADMIN' },
          { isSystem: true },
        ],
      },
    });

    if (!role) {
      role = await prisma.role.findFirst();
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newStaff = await prisma.user.create({
      data: {
        name,
        email: email.trim().toLowerCase(),
        passwordHash,
        department,
        roleId: role.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
        role: { select: { name: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Staff account for ${name} (${department} Department) created successfully!`,
      staff: newStaff,
    });
  } catch (error) {
    console.error('Error creating staff account:', error);
    return res.status(500).json({ success: false, message: 'Failed to create staff account.' });
  }
};

// PUT /api/v1/admin/staff/:id - Update Staff Department or Reset Password
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, isActive, password } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
        role: { select: { name: true } },
      },
    });

    return res.json({
      success: true,
      message: `Staff account ${updated.name} updated successfully!`,
      staff: updated,
    });
  } catch (error) {
    console.error('Error updating staff account:', error);
    return res.status(500).json({ success: false, message: 'Failed to update staff account.' });
  }
};

// DELETE /api/v1/admin/staff/:id - Delete Staff
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await prisma.user.findUnique({ where: { id } });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (req.user?.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own active staff account.' });
    }

    if (staff.email === 'admin@printbazzar.online') {
      return res.status(400).json({ success: false, message: 'Cannot delete primary Super Admin account.' });
    }

    await prisma.user.delete({ where: { id } });

    return res.json({
      success: true,
      message: `Staff account ${staff.name} deleted successfully.`,
    });
  } catch (error) {
    console.error('Error deleting staff account:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete staff account.' });
  }
};
