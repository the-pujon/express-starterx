export interface ProcessedFile {
    path: string;
    filename: string;
    originalname: string;
  }
  
  export interface ProcessedFiles {
    [fieldname: string]: ProcessedFile[];
  } 