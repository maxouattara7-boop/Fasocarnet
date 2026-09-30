import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminService } from './adminService';
import { syncService } from './syncService';
import { CommercialTeam } from '../../types';

describe('TeamLeader Admin Service', () => {
  beforeEach(() => {
    localStorage.clear();
    syncService.saveCloudDatabase({});
    vi.restoreAllMocks();
  });

  it('allows creating, retrieving and verifying credentials of a team leader', async () => {
    // 1. Création d'une équipe
    const team: CommercialTeam = {
      id: 'team_bobo',
      name: 'Équipe Bobo Nord',
      zone: 'Bobo-Dioulasso',
      affiliateCodes: ['BOBO01'],
      createdAt: new Date().toISOString()
    };
    await adminService.saveCommercialTeam(team);

    // 2. Création d'un compte chef d'équipe
    const leader = await adminService.saveTeamLeader({
      fullName: 'Oumar Traoré',
      phone: '70112233',
      pinCode: '1234',
      teamId: 'team_bobo',
      teamName: 'Équipe Bobo Nord',
      zone: 'Bobo-Dioulasso',
      status: 'active'
    });

    expect(leader.id).toBeDefined();
    expect(leader.fullName).toBe('Oumar Traoré');
    expect(leader.phone).toBe('70112233');
    expect(leader.pinCodeHash).toBeDefined();

    // 3. Récupération de tous les chefs
    const leaders = await adminService.getAllTeamLeaders();
    expect(leaders.length).toBe(1);
    expect(leaders[0].fullName).toBe('Oumar Traoré');

    // 4. Vérification d'authentification valide
    const verified = await adminService.verifyTeamLeaderCredentials('70112233', '1234');
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe(leader.id);

    // 5. Mauvais code PIN
    const failedAuth = await adminService.verifyTeamLeaderCredentials('70112233', '9999');
    expect(failedAuth).toBeNull();
  });

  it('provides isolated dashboard data for a specific team leader', async () => {
    // Création équipe & chef
    const team = await adminService.saveCommercialTeam({
      id: 'team_kdg',
      name: 'Équipe Koudougou',
      zone: 'Koudougou',
      affiliateCodes: ['KDG_ALI'],
      createdAt: new Date().toISOString()
    });

    const leader = await adminService.saveTeamLeader({
      fullName: 'Salif Kaboré',
      phone: '76554433',
      pinCode: '5678',
      teamId: team.id,
      teamName: team.name,
      zone: 'Koudougou',
      status: 'active'
    });

    // Ajout d'un commercial rattaché à cette équipe
    await adminService.saveCommercialAgent({
      code: 'KDG_ALI',
      fullName: 'Ali Zongo',
      phone: '71223344',
      teamId: team.id,
      teamName: team.name,
      zone: 'Koudougou',
      status: 'active'
    });

    // Récupération des données du dashboard chef d'équipe
    const dashboardData = await adminService.getTeamLeaderDashboardData(leader.id);
    expect(dashboardData).not.toBeNull();
    expect(dashboardData?.leader.fullName).toBe('Salif Kaboré');
    expect(dashboardData?.team.name).toBe('Équipe Koudougou');
    expect(dashboardData?.commercials.length).toBeGreaterThanOrEqual(1);
    expect(dashboardData?.commercials[0].code).toBe('KDG_ALI');
  });

  it('allows deleting a team leader', async () => {
    const leader = await adminService.saveTeamLeader({
      fullName: 'Chef Test',
      phone: '78990011',
      pinCode: '0000',
      teamId: 'team_test',
      teamName: 'Équipe Test',
      status: 'active'
    });

    let leaders = await adminService.getAllTeamLeaders();
    expect(leaders.length).toBe(1);

    await adminService.deleteTeamLeader(leader.id);
    leaders = await adminService.getAllTeamLeaders();
    expect(leaders.length).toBe(0);
  });
});
