import { Building2, FileClock, ShieldCheck, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "../../components/StatCard";
import { api } from "../../services/apiClient";
import type { Organization, UserRole } from "../../types/domain";

interface AdminSummary {
  users: number;
  organizations: number;
  activeVerifiers: number;
  auditEvents: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    user?: { fullName: string };
  }[];
}

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organization?: Pick<Organization, "id" | "name" | "region"> | null;
}

interface AdminOrganization extends Organization {
  _count: { users: number; assets: number };
}

interface AdminPolicy {
  version: string;
  evidenceTypes: string[];
  verificationScopes: string[];
  lifecycleTransitions: Record<string, string[]>;
  editingMode: string;
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: () => api.get<AdminSummary>("/admin/summary"),
  });
  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<{ users: AdminUser[] }>("/admin/users"),
  });
  const { data: organizationsData } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: () =>
      api.get<{ organizations: AdminOrganization[] }>("/admin/organizations"),
  });
  const { data: policy } = useQuery({
    queryKey: ["admin-policy"],
    queryFn: () => api.get<AdminPolicy>("/admin/policy"),
  });
  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
    },
  });
  if (isLoading || !data)
    return <div className="page-state">Đang tải dữ liệu quản trị…</div>;
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Quản trị hệ thống</p>
          <h1>Tổ chức, quyền và dấu vết kiểm toán</h1>
          <p>
            Quyền verifier do admin cấp; API luôn kiểm tra role từ phiên server.
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div><h2>Người dùng và vai trò</h2><p>Thay đổi được ghi vào audit log; admin không thể tự gỡ quyền của mình.</p></div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Người dùng</th><th>Tổ chức</th><th>Vai trò</th></tr></thead>
            <tbody>
              {(usersData?.users ?? []).map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.fullName}</strong><small>{user.email}</small></td>
                  <td>{user.organization?.name ?? "Chưa gán"}</td>
                  <td>
                    <select
                      value={user.role}
                      disabled={updateRole.isPending}
                      onChange={(event) => updateRole.mutate({ id: user.id, role: event.target.value as UserRole })}
                    >
                      <option value="operator">Người quản lý tài sản</option>
                      <option value="verifier">Người xác minh</option>
                      <option value="reviewer">Bên xem hồ sơ</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {updateRole.error && <p className="form-error">{updateRole.error.message}</p>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Tổ chức</h2><p>Quy mô người dùng và tài sản theo đơn vị.</p></div></div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Tổ chức</th><th>Khu vực</th><th>Người dùng</th><th>Tài sản</th></tr></thead>
            <tbody>
              {(organizationsData?.organizations ?? []).map((organization) => (
                <tr key={organization.id}><td><strong>{organization.name}</strong><small>{organization.type}</small></td><td>{organization.region}</td><td>{organization._count.users}</td><td>{organization._count.assets}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="stats-grid four">
        <StatCard label="Người dùng" value={data.users} icon={Users} />
        <StatCard label="Tổ chức" value={data.organizations} icon={Building2} />
        <StatCard
          label="Verifier hoạt động"
          value={data.activeVerifiers}
          icon={ShieldCheck}
        />
        <StatCard
          label="Sự kiện kiểm toán"
          value={data.auditEvents.length}
          icon={FileClock}
        />
      </div>
      <section className="panel">
        <h2>Nhật ký kiểm toán gần nhất</h2>
        <div className="audit-list">
          {data.auditEvents.map((event) => (
            <div key={event.id}>
              <span>{event.action}</span>
              <strong>{event.entityType}</strong>
              <small>
                {event.user?.fullName ?? "Hệ thống"} ·{" "}
                {new Date(event.createdAt).toLocaleString("vi-VN")}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Cấu hình chính sách · {policy?.version}</h2><p>Chính sách chỉ đọc; thay đổi phải qua source review và kiểm thử.</p></div></div>
        <div className="policy-grid">
          <div><h3>Schema bằng chứng</h3><p>{policy?.evidenceTypes.join(" · ")}</p></div>
          <div><h3>Phạm vi xác minh</h3><p>{policy?.verificationScopes.join(" · ")}</p></div>
          <div><h3>Quy tắc vòng đời</h3>{Object.entries(policy?.lifecycleTransitions ?? {}).map(([from, to]) => <p key={from}><strong>{from}</strong> → {to.join(", ") || "Kết thúc"}</p>)}</div>
        </div>
      </section>
    </div>
  );
}
