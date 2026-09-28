import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/apiClient";
import type { VerificationRequest } from "../../types/domain";

export function VerificationRequests() {
  const { data, isLoading } = useQuery({
    queryKey: ["verification-requests"],
    queryFn: () =>
      api.get<{ requests: VerificationRequest[] }>("/verification-requests"),
  });
  if (isLoading) return <div className="page-state">Đang tải yêu cầu…</div>;
  const requests = data?.requests ?? [];
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Yêu cầu xác minh</p>
          <h1>Hàng đợi bằng chứng</h1>
          <p>
            Mở tài liệu, kiểm tra nguồn và chỉ ký sau khi phạm vi kết luận đã
            rõ.
          </p>
        </div>
      </div>
      <section className="panel">
        {requests.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tài sản</th>
                  <th>Bằng chứng</th>
                  <th>Phạm vi</th>
                  <th>Người yêu cầu</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.asset?.displayName}</strong>
                      <small>{request.asset?.assetCode}</small>
                    </td>
                    <td>{request.evidence?.title}</td>
                    <td>{request.requestedScope}</td>
                    <td>{request.requester?.fullName}</td>
                    <td>
                      <StatusPill value={request.status} />
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        to={`/verifier/requests/${request.id}`}
                      >
                        Kiểm tra
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Không có yêu cầu"
            description="Chưa có bằng chứng nào được gửi tới trung tâm xác minh."
          />
        )}
      </section>
    </div>
  );
}
