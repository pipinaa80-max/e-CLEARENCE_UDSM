import { Injectable } from '@angular/core';
import { openDB, DBSchema } from 'idb';

interface OfflineOperation {
    id: string;
    operationType: string;
    entityType: string;
    entityId: number;
    payload: any;
    createdAt: string;
    status: 'PENDING' | 'SYNCED' | 'FAILED';
    retryCount: number;
}

interface ClearanceDB extends DBSchema {

    operations: {
        key: string;
        value: OfflineOperation;
        indexes: {
            'by-status': string;
        };
    };

}

@Injectable({
    providedIn: 'root'
})
export class OfflineDbService {

    private dbPromise = openDB<ClearanceDB>(
        '' +
        'clearance-db',
        1,
        {
            upgrade(db) {

                const store = db.createObjectStore(
                    'operations',
                    {
                        keyPath: 'id'
                    }
                );

                store.createIndex(
                    'by-status',
                    'status');

            }
        }
    );

    async saveOperation(operation: OfflineOperation):

        Promise<void> {
        const db = await this.dbPromise;
        await db.put('operations', operation);
    }


    async getPendingOperations():

        Promise<OfflineOperation[]> {

        const db = await this.dbPromise;
        return db.getAllFromIndex('operations', 'by-status', 'PENDING');
    }

    async deleteOperation(id: string):

        Promise<void> {
        const db = await this.dbPromise;
        await db.delete('operations', id);
    }
}