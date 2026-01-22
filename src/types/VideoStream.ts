export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  id: string;
  points: Point[];
}

export interface Backend {
  id: number;
  url: string;
  description: string;
  input_format: number;
  created_at: string;
  updated_at: string;
}

export interface Selection {
  id: number;
  selection: Point[];
  description: string;
  pushed_to_backend: boolean;
  backend_id: number;
  stream_id: number;
  created_at: string;
  updated_at: string;
  backend: Backend;
}
