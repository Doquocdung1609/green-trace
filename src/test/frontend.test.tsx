import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthContext, type AuthContextValue } from '../contexts/auth-context';
import { AssetPassport } from '../pages/passport/AssetPassport';
import type { Asset, User } from '../types/domain';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const user = { id:'u',email:'operator@test.vn',fullName:'Operator',role:'operator' } as User;
const auth = (current: User | null): AuthContextValue => ({user:current,loading:false,login:vi.fn(),register:vi.fn(),logout:vi.fn(),refresh:vi.fn()});

describe('frontend role routes and trust rendering', () => {
  it('allows a configured role and redirects a different role', () => {
    const view = render(<AuthContext.Provider value={auth(user)}><MemoryRouter initialEntries={['/operator']}><Routes><Route element={<ProtectedRoute roles={['operator']}/>}><Route path="/operator" element={<div>Operator workspace</div>}/></Route><Route path="/reviewer" element={<div>Reviewer workspace</div>}/></Routes></MemoryRouter></AuthContext.Provider>);
    expect(screen.getByText('Operator workspace')).toBeInTheDocument(); view.unmount();
    render(<AuthContext.Provider value={auth({...user,role:'reviewer'})}><MemoryRouter initialEntries={['/operator']}><Routes><Route element={<ProtectedRoute roles={['operator']}/>}><Route path="/operator" element={<div>Operator workspace</div>}/></Route><Route path="/reviewer" element={<div>Reviewer workspace</div>}/></Routes></MemoryRouter></AuthContext.Provider>);
    expect(screen.getByText('Reviewer workspace')).toBeInTheDocument();
  });

  it('renders the explainable trust score and disclaimer', async () => {
    const asset = { id:'a',assetCode:'GT-NL-2026-000128',displayName:'Sâm Ngọc Linh',assetType:'Dược liệu',species:'Panax vietnamensis',custodianId:'u',organizationId:'o',description:'Demo',region:'Nam Trà My',plantedAt:'2021-01-01',currentStage:'INSPECTED',passportStatus:'NEEDS_REVIEW',createdAt:'2026-01-01',updatedAt:'2026-01-01',trustProfile:{identityScore:20,evidenceScore:17,verificationScore:21,freshnessScore:13,consistencyScore:11,totalScore:82,warningCount:1,warnings:[{code:'CERT_EXPIRING',severity:'MEDIUM',message:'Chứng nhận sắp hết hạn'}],calculatedAt:'2026-01-01'},passports:[{id:'p',assetId:'a',version:1,passportHash:'a'.repeat(64),readinessStatus:'NEEDS_REVIEW',generatedAt:'2026-01-01'}],evidence:[],attestations:[],lifecycleEvents:[],blockchainTransactions:[]} as Asset;
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:200,json:async()=>({asset})}));
    const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/passport/GT-NL-2026-000128']}><Routes><Route path="/passport/:assetCode" element={<AssetPassport/>}/></Routes></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText('82')).toBeInTheDocument());
    expect(screen.getByText('Điểm tin cậy hồ sơ')).toBeInTheDocument(); expect(screen.getByText(/không cung cấp điểm tín dụng/i)).toBeInTheDocument();
  });

  it('shows a public passport error state', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:404,json:async()=>({error:'Không tìm thấy'})})); const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/passport/missing']}><Routes><Route path="/passport/:assetCode" element={<AssetPassport/>}/></Routes></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText('Không tìm thấy hộ chiếu')).toBeInTheDocument());
  });
});

