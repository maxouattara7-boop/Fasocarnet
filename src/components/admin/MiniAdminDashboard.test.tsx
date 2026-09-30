import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MiniAdminDashboard } from './MiniAdminDashboard';
import { useAppStore } from '../../store/appStore';
import { adminService } from '../../db/services/adminService';
import { TeamLeaderAccount } from '../../types';

describe('MiniAdminDashboard Component', () => {
  const mockLeader: TeamLeaderAccount = {
    id: 'leader_test_1',
    fullName: 'Ibrahim Ouedraogo',
    phone: '70001122',
    pinCodeHash: 'hash',
    teamId: 'team_ouaga_nord',
    teamName: 'Équipe Ouaga Nord',
    zone: 'Ouagadougou Nord',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      activeTeamLeader: mockLeader,
      isMiniAdminOpen: true
    });
    vi.restoreAllMocks();
  });

  it('renders team leader dashboard with team metrics and header', async () => {
    vi.spyOn(adminService, 'getTeamLeaderDashboardData').mockResolvedValue({
      leader: mockLeader,
      team: {
        id: 'team_ouaga_nord',
        name: 'Équipe Ouaga Nord',
        affiliateCodes: ['IBRAHIM226'],
        createdAt: new Date().toISOString()
      },
      membersCount: 1,
      totalShopsReferred: 5,
      activeSubscribedShops: 3,
      currentWeekCommissionTotal: 900,
      commercials: [
        {
          code: 'IBRAHIM226',
          name: 'Ibrahim Ouedraogo',
          phone: '70001122',
          totalShopsReferred: 5,
          activeSubscribedShops: 3,
          totalRevenueGenerated: 6000,
          totalCommissionAllTime: 900,
          currentWeekRevenue: 6000,
          currentWeekPaidCount: 3,
          currentWeekCommissionDue: 900,
          currentWeekIsSettled: false,
          settlements: [],
          referredShops: []
        }
      ]
    });

    render(<MiniAdminDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText(/Ibrahim Ouedraogo/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Équipe Ouaga Nord/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/IBRAHIM226/i)).toBeInTheDocument();
    });
  });

  it('allows opening recruit modal and recruiting a new commercial', async () => {
    vi.spyOn(adminService, 'getTeamLeaderDashboardData').mockResolvedValue({
      leader: mockLeader,
      team: {
        id: 'team_ouaga_nord',
        name: 'Équipe Ouaga Nord',
        affiliateCodes: [],
        createdAt: new Date().toISOString()
      },
      membersCount: 0,
      totalShopsReferred: 0,
      activeSubscribedShops: 0,
      currentWeekCommissionTotal: 0,
      commercials: []
    });

    const saveSpy = vi.spyOn(adminService, 'saveCommercialAgent').mockResolvedValue({
      id: 'agent_123',
      code: 'SALIF226',
      fullName: 'Salif Sanogo',
      phone: '71223344',
      teamId: 'team_ouaga_nord',
      teamName: 'Équipe Ouaga Nord',
      status: 'active',
      createdAt: new Date().toISOString()
    });

    render(<MiniAdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/\+ RECRUTER UN COMMERCIAL/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/\+ RECRUTER UN COMMERCIAL/i));

    // Remplir le formulaire
    const nameInput = screen.getByPlaceholderText(/Moussa Kaboré/i);
    const phoneInput = screen.getByPlaceholderText(/70 12 34 56/i);

    fireEvent.change(nameInput, { target: { value: 'Salif Sanogo' } });
    fireEvent.change(phoneInput, { target: { value: '71223344' } });

    const submitBtn = screen.getByRole('button', { name: /VALIDER ET ENREGISTRER/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
        fullName: 'Salif Sanogo',
        phone: '71223344',
        teamId: 'team_ouaga_nord'
      }));
      expect(screen.getByText(/Commercial Enregistré avec Succès/i)).toBeInTheDocument();
      expect(screen.getByText(/SALIF226/i)).toBeInTheDocument();
    });
  });
});
