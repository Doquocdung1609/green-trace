import { Building2, Scale, ShieldCheck, Sprout, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { StatCard } from "../../components/StatCard";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
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
  verificationPolicies: { id: string; evidenceType: string; verificationRequired: boolean; requiredScope?: string | null; requiredVerifierCategory?: string | null }[];
  assetTemplates: { id: string; name: string; version: number }[];
}

export function AdminDashboard() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [pendingRole, setPendingRole] = useState<{ user: AdminUser; role: UserRole } | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: () => api.get<AdminSummary>("/admin/summary"),
  });
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<{ users: AdminUser[] }>("/admin/users"),
  });
  const { data: organizationsData, isLoading: organizationsLoading, error: organizationsError } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: () =>
      api.get<{ organizations: AdminOrganization[] }>("/admin/organizations"),
  });
  const { data: policy, isLoading: policyLoading, error: policyError } = useQuery({
    queryKey: ["admin-policy"],
    queryFn: () => api.get<AdminPolicy>("/admin/policy"),
  });
  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-summary"] });
      notify("Đã cập nhật vai trò", { description: "Thay đổi được ghi nhận trong nhật ký kiểm toán." });
      setPendingRole(null);
    },
    onError: (reason) => notify("Không thể cập nhật vai trò", { description: reason instanceof Error ? reason.message : "Vui lòng thử lại.", tone: "error" }),
  });
  if (isLoading || usersLoading || organizationsLoading || policyLoading) return <LoadingSkeleton label="Đang tải dữ liệu quản trị" />;
  if (error || usersError || organizationsError || policyError || !data) return <ErrorState description="Không thể tải đầy đủ dữ liệu quản trị hệ thống." />;
  const assetCount = (organizationsData?.organizations ?? []).reduce((total, organization) => total + organization._count.assets, 0);
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Quản trị hệ thống" title="Tổ chức, quyền và dấu vết kiểm toán" description="Quyền verifier do admin cấp; API luôn kiểm tra role từ phiên server." />
      <section className="panel">
        <SectionHeader title="Người dùng và vai trò" description="Thay đổi được ghi vào audit log; admin không thể tự gỡ quyền của mình." />
        {usersData?.users.length ? <DataTable label="Người dùng và vai trò">
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
                      onChange={(event) => setPendingRole({ user, role: event.target.value as UserRole })}
                    >
                      <option value="operator">Người quản lý tài sản</option>
                      <option value="verifier">Người xác minh</option>
                      <option value="reviewer">Bên xem hồ sơ</option>
                      <option value="buyer">Người mua tài sản</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
        </DataTable> : <EmptyState title="Chưa có người dùng" description="Người dùng mới sẽ xuất hiện sau khi đăng ký hoặc được quản trị viên tạo." />}
        {updateRole.error && <p className="form-error">{updateRole.error.message}</p>}
      </section>
      <section className="panel">
        <SectionHeader title="Tổ chức" description="Quy mô người dùng và tài sản theo đơn vị." />
        {organizationsData?.organizations.length ? <DataTable label="Danh sách tổ chức">
            <thead><tr><th>Tổ chức</th><th>Khu vực</th><th>Người dùng</th><th>Tài sản</th></tr></thead>
            <tbody>
              {(organizationsData?.organizations ?? []).map((organization) => (
                <tr key={organization.id}><td><strong>{organization.name}</strong><small>{organization.type}</small></td><td>{organization.region}</td><td>{organization._count.users}</td><td>{organization._count.assets}</td></tr>
              ))}
            </tbody>
        </DataTable> : <EmptyState title="Chưa có tổ chức" description="Các tổ chức sẽ xuất hiện khi có hồ sơ đăng ký hợp lệ." />}
      </section>
      <div className="stats-grid five">
        <StatCard label="Người dùng" value={data.users} icon={Users} />
        <StatCard label="Tổ chức" value={data.organizations} icon={Building2} />
        <StatCard
          label="Verifier hoạt động"
          value={data.activeVerifiers}
          icon={ShieldCheck}
        />
        <StatCard label="Tổng tài sản" value={assetCount} icon={Sprout} />
        <StatCard label="Phiên bản chính sách" value={policy?.version ?? "—"} icon={Scale} />
      </div>
      <section className="panel">
        <SectionHeader title="Nhật ký kiểm toán gần nhất" description="Dấu vết thao tác gần đây của người dùng và hệ thống." />
        {data.auditEvents.length ? <div className="audit-list">
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
        </div> : <EmptyState title="Chưa có sự kiện kiểm toán" description="Các thay đổi quyền và cấu hình sẽ được ghi nhận tại đây." />}
      </section>
      <section className="panel">
        <SectionHeader title={`Cấu hình chính sách · ${policy?.version}`} description="Chính sách chỉ đọc; thay đổi phải qua source review và kiểm thử." />
        <div className="policy-grid">
          <div><h3>Schema bằng chứng</h3><p>{policy?.evidenceTypes.join(" · ")}</p></div>
          <div><h3>Phạm vi xác minh</h3><p>{policy?.verificationScopes.join(" · ")}</p></div>
          <div><h3>Quy tắc vòng đời</h3>{Object.entries(policy?.lifecycleTransitions ?? {}).map(([from, to]) => <p key={from}><strong>{from}</strong> → {to.join(", ") || "Kết thúc"}</p>)}</div>
          <div><h3>Policy xác minh 2+1</h3>{policy?.verificationPolicies.map((item) => <p key={item.id}><strong>{item.evidenceType}</strong> · {item.verificationRequired ? `Verifier ${item.requiredVerifierCategory ?? "độc lập"} / ${item.requiredScope}` : "Hệ thống kiểm tra, không tạo request"}</p>)}</div>
          <div><h3>Mẫu tài sản</h3>{policy?.assetTemplates.map((item) => <p key={item.id}><strong>{item.name}</strong> · v{item.version}</p>)}</div>
        </div>
      </section>
      <ConfirmDialog open={Boolean(pendingRole)} title="Xác nhận thay đổi vai trò" description={pendingRole ? `Vai trò của ${pendingRole.user.fullName} sẽ đổi từ ${pendingRole.user.role} sang ${pendingRole.role}. Thay đổi có hiệu lực với quyền truy cập API.` : ""} confirmLabel="Cập nhật vai trò" busy={updateRole.isPending} onCancel={() => setPendingRole(null)} onConfirm={() => pendingRole && updateRole.mutate({ id: pendingRole.user.id, role: pendingRole.role })} />
    </div>
  );
}
