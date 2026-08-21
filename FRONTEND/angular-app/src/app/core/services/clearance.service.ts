import { Injectable } from '@angular/core';
import { ClearanceOffice, ClearanceRequest } from '../models/clearance.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ClearanceService {
  private readonly storage = new StorageService();
  private readonly requestKey = 'udsm-clearance-requests';
  private readonly parallelOffices: ClearanceOffice[] = ['Games Coach', 'Hall Warden', 'USAB', 'DARUSO', 'Library', 'Dean of Students', 'Smart Card'];

  createRequest(studentId: string, college: string, department: string, programme: string): ClearanceRequest {
    const request: ClearanceRequest = {
      id: crypto.randomUUID(), studentId, college, department, programme, requestDate:new Date().toISOString(), status:'Pending', currentStage:'Convocation', currentOffice:'Convocation',
      approvals:[{office:'Convocation',status:'Pending'}, ...this.parallelOffices.map((office)=>({office,status:'Pending' as const})), {office:'Department',status:'Pending'}, {office:'Principal',status:'Pending'}, {office:'Finance',status:'Pending'}]
    };
    const requests=this.getAllRequests(); requests.push(request); this.storage.save(this.requestKey,requests); return request;
  }
  getAllRequests(): ClearanceRequest[] {
    return (this.storage.get<ClearanceRequest[]>(this.requestKey) ?? []).map((request) => this.normaliseRequest(request));
  }
  getRequest(id:string):ClearanceRequest|undefined{return this.getAllRequests().find((request)=>request.id===id);}
  getStudentRequests(studentId:string):ClearanceRequest[]{return this.getAllRequests().filter((request)=>request.studentId===studentId);}
  getClearanceHistory(studentId:string):ClearanceRequest[]{return this.getStudentRequests(studentId).slice().reverse();}
  getClearanceStatus(studentId:string):string{const request=this.getStudentRequests(studentId).at(-1);return request?request.status==='Pending'?`Pending - ${request.currentOffice??request.currentStage}`:request.status:'Not Requested';}
  getApprovalsForRequest(requestId:string){return (this.getRequest(requestId)?.approvals??[]).map((approval,sequenceIndex)=>({ ...approval, officeId:approval.office, group:this.parallelOffices.includes(approval.office)?'parallel' as const:'stage' as const, sequenceIndex, date:approval.reviewedAt }));}
  getRequestsForOffice(office:ClearanceOffice,college?:string,department?:string):ClearanceRequest[]{return this.getAllRequests().filter((request)=>{const approval=request.approvals.find((item)=>item.office===office);if(request.status!=='Pending'||approval?.status!=='Pending')return false;if(office==='Convocation')return request.currentStage==='Convocation';if(this.parallelOffices.includes(office))return request.currentStage==='Parallel';if(office==='Department')return request.currentStage==='Department'&&request.college===college&&request.department===department;return request.currentStage===office;});}
  approveRequest(requestId:string,office:ClearanceOffice,staffName:string):void{const request=this.getRequest(requestId);const approval=request?.approvals.find((item)=>item.office===office);if(!request||!approval||approval.status!=='Pending')return;approval.status='Approved';approval.comment='Approved';approval.reviewedBy=staffName;approval.reviewedAt=new Date().toISOString();this.moveToNextStage(request);this.save(request);}
  rejectRequest(requestId:string,office:ClearanceOffice,staffName:string,comment:string):void{const request=this.getRequest(requestId);const approval=request?.approvals.find((item)=>item.office===office);if(!request||!approval||!comment.trim())return;approval.status='Rejected';approval.comment=comment;approval.reviewedBy=staffName;approval.reviewedAt=new Date().toISOString();request.status='Rejected';this.save(request);}
  private moveToNextStage(request:ClearanceRequest):void{if(request.currentStage==='Convocation'){request.currentStage='Parallel';request.currentOffice=this.parallelOffices[0];return;}if(request.currentStage==='Parallel'){if(this.parallelOffices.every((office)=>request.approvals.find((item)=>item.office===office)?.status==='Approved')){request.currentStage='Department';request.currentOffice='Department';}return;}if(request.currentStage==='Department'){request.currentStage='Principal';request.currentOffice='Principal';return;}if(request.currentStage==='Principal'){request.currentStage='Finance';request.currentOffice='Finance';return;}if(request.currentStage==='Finance'){request.currentStage='Completed';request.status='Completed';request.currentOffice=undefined;}}
  private normaliseRequest(request: ClearanceRequest): ClearanceRequest {
    const approvals = request.approvals?.length ? request.approvals : [
      { office: 'Convocation' as ClearanceOffice, status: 'Pending' as const },
      ...this.parallelOffices.map((office) => ({ office, status: 'Pending' as const })),
      { office: 'Department' as ClearanceOffice, status: 'Pending' as const },
      { office: 'Principal' as ClearanceOffice, status: 'Pending' as const },
      { office: 'Finance' as ClearanceOffice, status: 'Pending' as const }
    ];
    const office = request.currentOffice;
    const stage = request.currentStage || (this.parallelOffices.includes(office as ClearanceOffice) ? 'Parallel' : office === 'Department' ? 'Department' : office === 'Principal' ? 'Principal' : office === 'Finance' ? 'Finance' : request.status === 'Completed' ? 'Completed' : 'Convocation');
    return { ...request, currentStage: stage, currentOffice: office ?? (stage === 'Parallel' ? this.parallelOffices[0] : stage === 'Completed' ? undefined : stage), approvals };
  }
  private save(updated:ClearanceRequest):void{this.storage.save(this.requestKey,this.getAllRequests().map((request)=>request.id===updated.id?updated:request));}
}
