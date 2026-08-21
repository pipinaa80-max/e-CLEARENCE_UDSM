import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DocumentService } from '../../core/services/document.service';
import { ClearanceService } from '../../core/services/clearance.service';
import { NotificationService } from '../../core/services/notification.service';
import { ClearanceRequest } from '../../core/models/clearance.model';

@Component({ selector:'app-convocation',standalone:true,imports:[CommonModule,FormsModule,ReactiveFormsModule,RouterLink],templateUrl:'./convocation.html',styleUrl:'./convocation.css' })
export class ConvocationComponent {
  private readonly fb=inject(FormBuilder); private readonly authService=inject(AuthService); private readonly documentService=inject(DocumentService); private readonly clearanceService=inject(ClearanceService); private readonly notificationService=inject(NotificationService); private readonly router=inject(Router);
  form=this.fb.nonNullable.group({controlNumber:['',Validators.required],receiptNumber:['',Validators.required],paymentDate:['',Validators.required],file:[null as File|null,Validators.required]}); selectedFileName='';errorMessage='';comment='';message='';
  get isOfficer():boolean{return this.authService.getCurrentUser()?.role==='Convocation';}
  get requests():ClearanceRequest[]{return this.clearanceService.getRequestsForOffice('Convocation');}
  onFileSelected(event:Event):void{const file=(event.target as HTMLInputElement).files?.[0]??null;this.selectedFileName='';this.form.controls.file.setValue(null);if(!file)return;if(!['application/pdf','image/jpeg','image/png'].includes(file.type)){this.errorMessage='Upload a PDF, JPG, or PNG receipt.';return;}if(file.size>5*1024*1024){this.errorMessage='Receipt must be 5 MB or less.';return;}this.errorMessage='';this.selectedFileName=file.name;this.form.controls.file.setValue(file);}
  submit():void{const user=this.authService.getCurrentUser();if(!user){this.router.navigate(['/login']);return;}if(this.form.invalid){this.errorMessage='Enter the control number, receipt details, and upload the receipt.';this.form.markAllAsTouched();return;}const value=this.form.getRawValue();const file=value.file!;this.documentService.uploadDocument({studentId:user.id,fileName:file.name,fileType:'Convocation Payment Receipt',fileSize:file.size,description:`Control No: ${value.controlNumber}; Receipt No: ${value.receiptNumber}; Payment Date: ${value.paymentDate}`},file).subscribe({next:()=>{this.notificationService.createNotification(user.id,'Convocation receipt submitted','Your receipt has been submitted for verification.','success');this.router.navigate(['/clearance/status']);},error:()=>{this.errorMessage='Receipt upload failed. Please try again.';}});}
  approve(request:ClearanceRequest):void{const staff=this.authService.getCurrentUser();if(!staff)return;this.clearanceService.approveRequest(request.id,'Convocation',staff.fullName);this.notificationService.createNotification(request.studentId,'Convocation clearance approved','Your receipt was verified. Parallel office checks have started.','success');this.message='Approved and forwarded to the parallel offices.';}
  reject(request:ClearanceRequest):void{const staff=this.authService.getCurrentUser();if(!staff||!this.comment.trim())return;this.clearanceService.rejectRequest(request.id,'Convocation',staff.fullName,this.comment);this.notificationService.createNotification(request.studentId,'Convocation action required',this.comment,'warning');this.message='The student has been notified.';this.comment='';}
  logout():void{this.authService.logoutLocal();this.router.navigate(['/login']);}
}
