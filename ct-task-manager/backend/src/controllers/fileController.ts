import { Request, Response } from 'express';
import mongoose from 'mongoose';

export const getFile = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database connection not ready' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'attachments'
    });

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    // Check if file exists
    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = files[0];

    // Set correct content type
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${file.filename}"`);

    // Stream file
    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on('error', () => {
      res.status(404).json({ success: false, message: 'Error streaming file' });
    });
    
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Error fetching file:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};

export const getFileMetadata = async (req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database connection not ready' });
    }

    const bucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'attachments'
    });

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    return res.status(200).json({ success: true, data: { file: files[0] } });
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
};
