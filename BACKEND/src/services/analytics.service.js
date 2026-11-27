const { db } = require('../config/database');
const {
  matchesCollegeScope,
  matchesDepartmentScope
} = require('../utils/academicScope');

class AnalyticsService {
  static async loadScopeCatalogs(scope = {}) {
    const [activeColleges, activeDepartments] = await Promise.all([
      scope.college ? db('colleges').where({ is_active: 1 }).select('code', 'name') : Promise.resolve([]),
      scope.department ? db('departments').where({ is_active: 1 }).select('code', 'name') : Promise.resolve([])
    ]);
    return { activeColleges, activeDepartments };
  }

  static matchesScopeRecord(record, scope = {}, catalogs = {}) {
    if (scope.college) {
      if (!matchesCollegeScope(record.college || '', scope.college, catalogs.activeColleges || [])) {
        return false;
      }
    }
    if (scope.department) {
      if (!matchesDepartmentScope(record.department || '', scope.department, catalogs.activeDepartments || [])) {
        return false;
      }
    }
    return true;
  }

  /**
   * University-level overview metrics
   */
  static async getOverviewMetrics(scope = {}, preloadedCatalogs = null) {
    const catalogs = preloadedCatalogs || await this.loadScopeCatalogs(scope);

    let reqQuery = db('clearance_requests').select('id', 'status', 'current_stage', 'college', 'department', 'submitted_at', 'updated_at');
    if (typeof scope.isPostgraduate === 'boolean') {
      reqQuery = reqQuery.where({ is_postgraduate: scope.isPostgraduate ? 1 : 0 });
    }
    const allRequests = await reqQuery;
    const requests = allRequests.filter(r => this.matchesScopeRecord(r, scope, catalogs));

    const totalRequests = requests.length;
    let completedRequests = 0;
    let inProgressRequests = 0;
    let pendingRequests = 0;
    let rejectedRequests = 0;
    let totalTurnaroundHours = 0;
    let turnaroundSamples = 0;

    const bottlenecks = {
      Convocation: 0,
      Parallel: 0,
      Department: 0,
      Principal: 0,
      Finance: 0,
      Supervisor: 0
    };

    for (const r of requests) {
      const st = String(r.status || '').toUpperCase();
      if (st === 'COMPLETED') {
        completedRequests += 1;
        if (r.submitted_at && r.updated_at) {
          const diffMs = new Date(r.updated_at).getTime() - new Date(r.submitted_at).getTime();
          totalTurnaroundHours += Math.max(0, diffMs / (1000 * 60 * 60));
          turnaroundSamples += 1;
        }
      } else if (st === 'IN_PROGRESS') {
        inProgressRequests += 1;
      } else if (st === 'REJECTED') {
        rejectedRequests += 1;
      } else {
        pendingRequests += 1;
      }

      if ((st === 'PENDING' || st === 'IN_PROGRESS') && r.current_stage && bottlenecks[r.current_stage] !== undefined) {
        bottlenecks[r.current_stage] += 1;
      }
    }

    const completionRate = totalRequests > 0 ? Number(((completedRequests / totalRequests) * 100).toFixed(1)) : 0;
    const avgTurnaroundHours = turnaroundSamples > 0 ? Number((totalTurnaroundHours / turnaroundSamples).toFixed(1)) : 0;

    // Registered students count (catalog-aware college/department matching)
    let studentQuery = db('students').select('id', 'college', 'department');
    if (typeof scope.isPostgraduate === 'boolean') {
      studentQuery = studentQuery.where({ is_postgraduate: scope.isPostgraduate ? 1 : 0 });
    }
    const allStudents = await studentQuery;
    const totalRegisteredStudents = allStudents.filter(s => this.matchesScopeRecord(s, scope, catalogs)).length;

    return {
      totalRegisteredStudents,
      totalRequests,
      completedRequests,
      inProgressRequests,
      pendingRequests,
      rejectedRequests,
      completionRate,
      avgTurnaroundHours,
      stageBottlenecks: bottlenecks
    };
  }

  /**
   * Office-level performance and workload breakdown
   */
  static async getOfficeMetrics(scope = {}, preloadedCatalogs = null) {
    const offices = [
      'Convocation',
      'Library',
      'Games Coach',
      'Hall Warden',
      'USAB',
      'DARUSO',
      'Dean of Students',
      'Smart Card',
      'Workshop',
      'Laboratory',
      'Department',
      'Principal',
      'Finance',
      'Supervisor'
    ];

    const catalogs = preloadedCatalogs || await this.loadScopeCatalogs(scope);
    const hasFilter = typeof scope.isPostgraduate === 'boolean' || Boolean(scope.college) || Boolean(scope.department);

    let qb = db('department_approvals')
      .select('department_approvals.department as office', 'department_approvals.status');

    if (hasFilter) {
      qb = qb
        .join('clearance_requests', 'department_approvals.clearance_request_id', 'clearance_requests.id')
        .select('clearance_requests.college', 'clearance_requests.department as req_department');
      if (typeof scope.isPostgraduate === 'boolean') {
        qb = qb.where('clearance_requests.is_postgraduate', scope.isPostgraduate ? 1 : 0);
      }
    }

    const allRows = await qb;
    const scopedRows = hasFilter
      ? allRows.filter(r => this.matchesScopeRecord({ college: r.college, department: r.req_department }, scope, catalogs))
      : allRows;

    const byOffice = {};
    for (const office of offices) {
      byOffice[office.toLowerCase()] = {
        office,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        totalAssigned: 0
      };
    }

    for (const r of scopedRows) {
      const key = String(r.office || '').trim().toLowerCase();
      const entry = byOffice[key];
      if (!entry) continue;
      const st = String(r.status || '').toUpperCase();
      if (st === 'APPROVED' || st === 'CLEARED') entry.approvedCount += 1;
      else if (st === 'REJECTED') entry.rejectedCount += 1;
      else entry.pendingCount += 1;
      entry.totalAssigned += 1;
    }

    const results = {};
    for (const office of offices) {
      results[office] = byOffice[office.toLowerCase()];
    }
    return results;
  }

  /**
   * College and department breakdown
   */
  static async getCollegeDepartmentMetrics(scope = {}, preloadedCatalogs = null) {
    const catalogs = preloadedCatalogs || await this.loadScopeCatalogs(scope);
    let query = db('clearance_requests').select('college', 'department', 'status');
    if (typeof scope.isPostgraduate === 'boolean') {
      query = query.where({ is_postgraduate: scope.isPostgraduate ? 1 : 0 });
    }

    const rawRows = await query;
    const rows = rawRows.filter(r => this.matchesScopeRecord(r, scope, catalogs));

    const hierarchy = {};

    rows.forEach(r => {
      const col = r.college || 'Unassigned College';
      const dep = r.department || 'General';
      const st = r.status || 'PENDING';

      if (!hierarchy[col]) hierarchy[col] = { college: col, departments: {}, total: 0, completed: 0 };
      if (!hierarchy[col].departments[dep]) {
        hierarchy[col].departments[dep] = { department: dep, total: 0, completed: 0, inProgress: 0, pending: 0, rejected: 0 };
      }

      hierarchy[col].total += 1;
      hierarchy[col].departments[dep].total += 1;

      if (st === 'COMPLETED') {
        hierarchy[col].completed += 1;
        hierarchy[col].departments[dep].completed += 1;
      } else if (st === 'IN_PROGRESS') {
        hierarchy[col].departments[dep].inProgress += 1;
      } else if (st === 'REJECTED') {
        hierarchy[col].departments[dep].rejected += 1;
      } else {
        hierarchy[col].departments[dep].pending += 1;
      }
    });

    // Fetch outstanding student debt counts per department
    const debts = await db('student_debt_flags')
      .where({ status: 'OPEN' })
      .select('college', 'department');

    const debtRows = debts.filter(d => this.matchesScopeRecord(d, scope, catalogs));

    // Flatten to list for easy UI consumption
    const collegesList = Object.values(hierarchy).map(col => ({
      college: col.college,
      totalRequests: col.total,
      completedRequests: col.completed,
      departments: Object.values(col.departments).map(dept => ({
        ...dept,
        outstandingDebtsCount: debtRows.filter(d =>
          matchesDepartmentScope(d.department, dept.department, catalogs.activeDepartments)
          && (!d.college || matchesCollegeScope(d.college, col.college, catalogs.activeColleges))
        ).length
      }))
    }));

    return collegesList;
  }

  /**
   * Comprehensive analytics summary scoped to calling user
   */
  static async getFullSummary(requestingUser) {
    const scope = {};
    if ((requestingUser.role === 'PRINCIPAL' || requestingUser.role === 'COLLEGE_PRINCIPAL') && requestingUser.college) {
      scope.college = requestingUser.college;
    } else if (requestingUser.role === 'DEPARTMENT_OFFICER' || requestingUser.role === 'SUPERVISOR') {
      if (requestingUser.college) scope.college = requestingUser.college;
      if (requestingUser.department) scope.department = requestingUser.department;
    } else if (requestingUser.role === 'DIRECTOR_OF_UNDERGRADUATE_STUDIES') {
      scope.isPostgraduate = false;
    } else if (requestingUser.role === 'DIRECTOR_OF_POSTGRADUATE_STUDIES') {
      scope.isPostgraduate = true;
    }

    const catalogs = await this.loadScopeCatalogs(scope);
    const [overview, offices, collegeDepts] = await Promise.all([
      this.getOverviewMetrics(scope, catalogs),
      this.getOfficeMetrics(scope, catalogs),
      this.getCollegeDepartmentMetrics(scope, catalogs)
    ]);

    // Format backward-compatible response for existing frontend while including rich Phase 4 metrics
    return {
      requests: {
        total: overview.totalRequests,
        pending: overview.pendingRequests,
        inProgress: overview.inProgressRequests,
        completed: overview.completedRequests,
        rejected: overview.rejectedRequests
      },
      totalRegisteredStudents: overview.totalRegisteredStudents,
      completionRate: overview.completionRate,
      avgTurnaroundHours: overview.avgTurnaroundHours,
      stageBottlenecks: overview.stageBottlenecks,
      offices,
      colleges: collegeDepts
    };
  }
}

module.exports = AnalyticsService;
