import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BUCKET_CONFIG } from '../config/bucket-config';
import { AuthService, User } from '../services/auth.service';

export interface FileUploadConfig {
  gcsBucket: string;
  destinationPath: string;  
  maxFileSize: number;
  status: string;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  status: 'uploading' | 'success' | 'error';
  progress?: number;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-upload.html',
  styleUrls: ['./file-upload.scss']
})
export class FileUpload implements OnInit {
  config: FileUploadConfig = {
    gcsBucket: '',
    destinationPath: '',
    maxFileSize: 10,
    status: 'Ready to upload'
  };

  availableBuckets: string[] = BUCKET_CONFIG.gcsBuckets;
  availablePaths: string[] = BUCKET_CONFIG.destinationPaths;

  selectedFiles: File[] = [];
  uploadHistory: UploadedFile[] = [];
  isDragOver = false;
  isUploading = false;

  currentUser: User | null = null;
  showDropdown = false; // Add this property

  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'text/plain', 'Excel/xlsx'];
  
  allowedExtensions = 'JPG, PNG, PDF, DOCX, TXT, XLSX';
  maxFileSizeBytes = this.config.maxFileSize * 1024 * 1024;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.availableBuckets.length > 0) {
      this.config.gcsBucket = this.availableBuckets[0];
    }
    if (this.availablePaths.length > 0) {
      this.config.destinationPath = this.availablePaths[0];
    }

    // Get current user
    this.currentUser = this.authService.getCurrentUser();
    
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.user-avatar-container');
    
    if (!clickedInside) {
      this.showDropdown = false;
    }
  }

  // Toggle dropdown
  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.showDropdown = !this.showDropdown;
  }

  // Logout function
  logout(): void {
    this.showDropdown = false;
    
    // If using real backend
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Navigate anyway
        this.router.navigate(['/login']);
      }
    });

    // OR if using demo logout, comment out the above and use:
    // this.authService.logoutDemo();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(input.files);
    }
  }

  private handleFiles(fileList: FileList): void {
    const files = Array.from(fileList);
    
    files.forEach(file => {
      if (this.validateFile(file)) {
        this.selectedFiles.push(file);
      }
    });
  }

  private validateFile(file: File): boolean {
    if (!this.allowedTypes.includes(file.type)) {
      alert(`File type not allowed: ${file.name}. Allowed types: ${this.allowedExtensions}`);
      return false;
    }

    if (file.size > this.maxFileSizeBytes) {
      alert(`File too large: ${file.name}. Maximum size: ${this.config.maxFileSize}MB`);
      return false;
    }

    return true;
  }

  async uploadFiles(): Promise<void> { 
    if (this.selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    this.isUploading = true;
    this.config.status = 'Uploading...';

    try {
      for (const file of this.selectedFiles) {
        await this.uploadSingleFile(file);
      }
      
      this.config.status = 'Upload completed';
      this.selectedFiles = [];
      
    } catch (error) {
      console.error('Upload error:', error);
      this.config.status = 'Upload failed';
    } finally {
      this.isUploading = false;
    }
  }

  private async uploadSingleFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date(),
        status: 'uploading',
        progress: 0
      };
      
      this.uploadHistory.unshift(uploadedFile);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', this.config.gcsBucket);
      formData.append('destinationPath', this.config.destinationPath);

      this.http.post('/api/upload', formData, {
        reportProgress: true,
        observe: 'events'
      }).subscribe({
        next: (event: any) => {
          if (event.type === 1) {
            uploadedFile.progress = Math.round(100 * event.loaded / event.total);
          } else if (event.type === 4) {
            uploadedFile.status = 'success';
            uploadedFile.progress = 100;
            resolve();
          }
        },
        error: (error) => {
          uploadedFile.status = 'error';
          reject(error);
        }
      });
    });
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  clearFiles(): void {
    this.selectedFiles = [];
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }
}
