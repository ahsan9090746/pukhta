import { requirePermission, resolvePermissions, clearPermissionCache } from '../middleware/role.middleware';

jest.mock('../models/role.model', () => ({
  Role: { findOne: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Role } = require('../models/role.model');

const run = async (role: string | undefined, ...perms: string[]) => {
  const next = jest.fn();
  const req = { user: role ? ({ role, _id: 'u1' } as never) : undefined } as never;
  await (requirePermission(...perms) as unknown as (a: unknown, b: unknown, c: (...args: never[]) => void) => Promise<void>)(
    req,
    {},
    next
  );
  return next;
};

describe('staff permissions (role.middleware)', () => {
  beforeEach(() => {
    clearPermissionCache();
    (Role.findOne as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
  });

  it('lets staff manage orders but not staff accounts', async () => {
    expect((await run('staff', 'orders.view')).mock.calls[0][0]).toBeUndefined();
    expect((await run('staff', 'orders.manage')).mock.calls[0][0]).toBeUndefined();
    const next = await run('staff', 'staff.manage');
    expect(next.mock.calls[0][0]?.statusCode || next.mock.calls[0][0]?.status).toBe(403);
  });

  it('lets admin manage staff, customers get nothing', async () => {
    expect((await run('admin', 'staff.manage')).mock.calls[0][0]).toBeUndefined();
    const next = await run('customer', 'orders.view');
    expect(next.mock.calls[0][0]?.statusCode || next.mock.calls[0][0]?.status).toBe(403);
  });

  it('lets super-admin through without touching the DB', async () => {
    const next = await run('super-admin', 'staff.manage');
    expect(next).toHaveBeenCalledWith();
    expect(Role.findOne).not.toHaveBeenCalled();
  });

  it('resolves custom roles (e.g. manager) from the DB Role collection', async () => {
    (Role.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ permissions: ['staff.manage', 'analytics.view'] }),
      }),
    });
    expect((await run('manager', 'staff.manage')).mock.calls[0][0]).toBeUndefined();
    const next = await run('manager', 'settings.manage');
    expect(next.mock.calls[0][0]?.statusCode || next.mock.calls[0][0]?.status).toBe(403);
  });

  it('denies unknown roles with no permissions', async () => {
    const perms = await resolvePermissions('ghost-role');
    expect(perms).toEqual([]);
  });
});
