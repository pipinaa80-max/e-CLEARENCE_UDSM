import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private readonly config = {
        apiUrl: 'http://localhost:8080/api/v1'
    };

    get apiUrl(): string {
        return this.config.apiUrl;
    }

    // You can also load from environment or external config
    setApiUrl(url: string): void {
        this.config.apiUrl = url;
    }
}