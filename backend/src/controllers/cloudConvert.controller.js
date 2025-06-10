import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { GoogleGenerativeAI } from '@google/generative-ai';

const { CLOUDCONVERT_API_KEY, GEMINI_API_KEY } = process.env;

export const analyzeWithCloudConvert = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
    }

    const filePath = req.file.path;
    const fileMimeType = req.file.mimetype;
    let imageBuffer;

    try {
        if (fileMimeType === 'image/jpeg' || fileMimeType === 'image/png') {
            console.log("SUCCESS: File is an image. Skipping conversion.");
            imageBuffer = fs.readFileSync(filePath);
        } else {
            console.log(`INFO: File requires conversion (Type: ${fileMimeType}). Starting CloudConvert workflow...`);

            const convertTask = {
                "operation": "convert",
                "input": "import-file",
                "output_format": "png",
            };

            if (fileMimeType === 'application/pdf') {
                console.log("INFO: PDF file detected. Setting engine to 'poppler'.");
                convertTask.engine = 'poppler';
                convertTask.pages = '1';
            } else {
                console.log("INFO: Non-PDF file detected. Setting engine to 'autocad'.");
                convertTask.engine = 'autocad';
            }

            console.log("STEP 1: Creating CloudConvert job...");
            const jobResponse = await axios.post('https://api.cloudconvert.com/v2/jobs', {
                "tasks": {
                    "import-file": { "operation": "import/upload" },
                    "convert-file": convertTask,
                    "export-result": { "operation": "export/url", "input": "convert-file" }
                }
            }, { 
                headers: { 'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}` } 
            });
            
            const job = jobResponse.data.data;
            const uploadTask = job.tasks.find(task => task.name === 'import-file');
            console.log("SUCCESS: CloudConvert job created with ID:", job.id);
            
            console.log("STEP 2: Uploading file to CloudConvert...");
            const form = new FormData();
            Object.entries(uploadTask.result.form.parameters).forEach(([key, value]) => form.append(key, value));
            form.append('file', fs.createReadStream(filePath));
            await axios.post(uploadTask.result.form.url, form, { headers: form.getHeaders() });
            console.log("SUCCESS: File uploaded.");
            
            console.log("STEP 3: Waiting for conversion job to finish...");
            let finalJobStatus;
            while (true) {
                const statusResponse = await axios.get(`https://api.cloudconvert.com/v2/jobs/${job.id}`, { headers: { 'Authorization': `Bearer ${CLOUDCONVERT_API_KEY}` } });
                finalJobStatus = statusResponse.data.data;
                console.log(`INFO: Current job status: ${finalJobStatus.status}`);
                if (finalJobStatus.status === 'finished') break;
                if (finalJobStatus.status === 'error') {
                     const failedTask = finalJobStatus.tasks.find(t => t.status === 'error');
                     throw new Error(failedTask.message || 'CloudConvert job failed');
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            console.log("SUCCESS: Conversion job finished.");
            
            console.log("STEP 4: Downloading converted PNG...");
            const exportTask = finalJobStatus.tasks.find(task => task.name === 'export-result');
            const pngUrl = exportTask.result.files[0].url;
            const imageResponse = await axios.get(pngUrl, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(imageResponse.data, 'binary');
            console.log("SUCCESS: PNG downloaded.");
        }

        console.log("STEP 5: Sending final image to Gemini for analysis...");
        const imagePart = {
            inlineData: { data: imageBuffer.toString('base64'), mimeType: 'image/png' }
        };

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = req.body.prompt || 'Analyze this image. If it is a construction blueprint or floor plan, provide a detailed analysis. Otherwise, simply describe its contents.';
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        console.log("SUCCESS: Gemini analysis complete.");

        res.status(200).json({ result: responseText });

    } catch (error) {
        // This will now give us a much more detailed error message in the terminal
        console.error("--- WORKFLOW FAILED ---");
        console.error("Error Message:", error.message);
        if (error.response) {
            console.error("Error Response Data:", error.response.data);
        }
        console.error("--- END OF ERROR ---");
        res.status(500).json({ message: 'Failed to process file. Check server logs for details.' });
    } finally {
        fs.unlinkSync(filePath);
    }
};