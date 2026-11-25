const { db } = require('../config/database');

class AnalyticsService {
  /**
   * University-level overview metrics
   */
  static async getOverviewMetrics(scope = {}) {
    let reqQuery = db('clearance_requests');
    if (scope.college) reqQuery = reqQuery.where({ college: scope.college });
    if (scope.department) reqQuery = reqQuery.where({ department: scope.department });

    const totalRequestsRow = await reqQuery.clone().count('id as count').first();
    const totalRequests = parseInt(totalRequestsRow?.count || 0, 10);

    const completedRow = await reqQuery.clone().where({ status: 'COMPLETED' }).count('id as count').first();
    const completedRequests = parseInt(completedRow?.count || 0, 10);

    const inProgressRow = await reqQuery.clone().where({ status: 'IN_PROGRESS' }).count('id as count').first();
    const inProgressRequests = parseInt(inProgressRow?.count || 0, 10);

    const pendingRow = await reqQuery.clone().where({ status: 'PENDING' }).count('id as count').first();
    const pendingRequests = parseInt(pendingRow?.count || 0, 10);

    const rejectedRow = await reqQuery.clone().where({ status: 'REJECTED' }).count('id as count').first();
    const rejectedRequests = parseInt(rejectedRow?.count || 0, 10);

    const completionRate = totalRequests > 0 ? Number(((completedRequests / totalRequests) * 100).toFixed(1)) : 0;

    // Registered students count
    let studentQuery = db('students');
    if (scope.college) studentQuery = studentQuery.where({ college: scope.college });
    if (scope.department) studentQuery = studentQuery.where({ department: scope.department });
    const studentCountRow = await studentQuery.count('id as count').first();
    const totalRegisteredStudents = parseInt(studentCountRow?.count || 0, 10);

    // Calculate average turnaround time for completed requests (in hours)
    const completedTimestamps = await reqQuery.clone()
      .where({ status: 'COMPLETED' })
      .whereNotNull('submitted_at')
      .whereNotNull('updated_at')
      .select('submitted_at', 'updated_at');

    let avgTurnaroundHours = 0;
    if (completedTimestamps.length > 0) {
      const totalHours = completedTimestamps.reduce((acc, row) => {
        const diffMs = new Date(row.updated_at).getTime() - new Date(row.submitted_at).getTime();
        return acc + Math.max(0, diffMs / (1000 * 60 * 60));
      }, 0);
      avgTurnaroundHours = Number((totalHours / completedTimestamps.length).toFixed(1));
    }

    // Stage Bottlenecks
    const bottlenecks = {
      Convocation: 0,
      Parallel: 0,
      Department: 0,
      Principal: 0,
      Finance: 0
    };

    const stageCounts = await reqQuery.clone()
      .whereIn('status', ['PENDING', 'IN_PROGRESS'])
      .groupBy('current_stage')
      .select('current_stage', db.raw('count(id) as count'));

    stageCounts.forEach(sc => {
      const stage = sc.current_stage;
      if (stage && bottlenecks[stage] !== undefined) {
        bottlenecks[stage] = parseInt(sc.count, 10);
      }
    });

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
  static async getOfficeMetrics() {
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
      'Finance'
    ];

    const results = {};

    for (const office of offices) {
      const rows = await db('department_approvals')
        .whereRaw('LOWER(department) = ?', [office.toLowerCase()])
        .groupBy('status')
        .select('status', db.raw('count(id) as count'));

      let approved = 0;
      let pending = 0;
      let rejected = 0;

      rows.forEach(r => {
        const st = (r.status || '').toUpperCase();
        const cnt = parseInt(r.count, 10);
        if (st === 'APPROVED' || st === 'CLEARED') approved += cnt;
        else if (st === 'REJECTED') rejected += cnt;
        else pending += cnt;
      });

      results[office] = {
        office,
        approvedCount: approved,
        pendingCount: pending,
        rejectedCount: rejected,
        totalAssigned: approved + pending + rejected
      };
    }

    return results;
  }

  /**
   * College and department breakdown
   */
  static async getCollegeDepartmentMetrics(scope = {}) {
    let query = db('clearance_requests');
    if (scope.college) query = query.where({ college: scope.college });
    if (scope.department) query = query.where({ department: scope.department });

    const rows = await query
      .groupBy('college', 'department', 'status')
      .select('college', 'department', 'status', db.raw('count(id) as count'));

    const hierarchy = {};

    rows.forEach(r => {
      const col = r.college || 'Unassigned College';
      const dep = r.department || 'General';
      const st = r.status || 'PENDING';
      const cnt = parseInt(r.count, 10);

      if (!hierarchy[col]) hierarchy[col] = { college: col, departments: {}, total: 0, completed: 0 };
      if (!hierarchy[col].departments[dep]) {
        hierarchy[col].departments[dep] = { department: dep, total: 0, completed: 0, inProgress: 0, pending: 0, rejected: 0 };
      }

      hierarchy[col].total += cnt;
      hierarchy[col].departments[dep].total += cnt;

      if (st === 'COMPLETED') {
        hierarchy[col].completed += cnt;
        hierarchy[col].departments[dep].completed += cnt;
      } else if (st === 'IN_PROGRESS') {
        hierarchy[col].departments[dep].inProgress += cnt;
      } else if (st === 'REJECTED') {
        hierarchy[col].departments[dep].rejected += cnt;
      } else {
        hierarchy[col].departments[dep].pending += cnt;
      }
    });

    // Fetch outstanding student debt counts per department
    const debts = await db('student_debt_flags')
      .where({ status: 'OPEN' })
      .groupBy('department')
      .select('department', db.raw('count(id) as debt_count'));

    const debtMap = {};
    debts.forEach(d => {
      if (d.department) debtMap[d.department] = parseInt(d.debt_count, 10);
    });

    // Flatten to list for easy UI consumption
    const collegesList = Object.values(hierarchy).map(col => ({
      college: col.college,
      totalRequests: col.total,
      completedRequests: col.completed,
      departments: Object.values(col.departments).map(dept => ({
        ...dept,
        outstandingDebtsCount: debtMap[dept.department] || 0
      }))
    }));

    return collegesList;
  }

  /**
   * Comprehensive analytics summary scoped to calling user
   */
  static async getFullSummary(requestingUser) {
    const scope = {};
    if (requestingUser.role === 'PRINCIPAL' && requestingUser.college) {
      scope.college = requestingUser.college;
    } else if (requestingUser.role === 'DEPARTMENT_OFFICER' && requestingUser.department) {
      scope.department = requestingUser.department;
    }

    const overview = await this.getOverviewMetrics(scope);
    const offices = await this.getOfficeMetrics();
    const collegeDepts = await this.getCollegeDepartmentMetrics(scope);

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
