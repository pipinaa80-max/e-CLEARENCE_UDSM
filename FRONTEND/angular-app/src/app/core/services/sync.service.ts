import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OfflineDbService } from './offline-db.service';

@Injectable({
    providedIn: 'root'
})
export class SyncService {

    private apiUrl = 'http://localhost:8080/api/v1';

    constructor(
        private http: HttpClient,
        private offlineDb: OfflineDbService
    ) {}

    async sync(): Promise<void> {

        const operations =
            await this.offlineDb
                .getPendingOperations();

        for (const operation of operations) {

            try {

                await this.http.post(
                    `${this.apiUrl}/sync`,
                    operation
                ).toPromise();

                await this.offlineDb
                    .deleteOperation(operation.id);

            } catch (error) {

                console.log(
                    'Synchronization failed',
                    error
                );

                break;
            }
        }
    }
}