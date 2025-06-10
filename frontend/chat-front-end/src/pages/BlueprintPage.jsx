import React, { useState } from "react"; 

 import { GoogleGenerativeAI } from "@google/generative-ai"; 

 import { FileText } from 'lucide-react';



 const BlueprintPage = () => { 

     // --- STATE MANAGEMENT --- 

     const [image, setImage] = useState(null); 

     const [loading, setLoading] = useState(false); 

     const [result, setResult] = useState(null); 

     const [keywords, setKeywords] = useState([]); 

     const [relatedQuestions, setRelatedQuestions] = useState([]); 

     const [textPrompt, setTextPrompt] = useState(''); 

     const [previewUrl, setPreviewUrl] = useState(null); 

     const [lastAnalysisInputType, setLastAnalysisInputType] = useState(null); 

     const [fileType, setFileType] = useState(null);



     // --- HELPER FUNCTIONS --- 

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

     const fileToGenerativePart = async (file) => { 

         return new Promise((resolve, reject) => { 

             const reader = new FileReader(); 

             reader.onloadend = () => { 

                 const base64Data = reader.result; 

                 const base64Content = base64Data.split(",")[1]; 

                 resolve({ 

                     inlineData: { data: base64Content, mimeType: file.type }, 

                 }); 

             }; 

             reader.onerror = reject; 

             reader.readAsDataURL(file); 

         }); 

     }; 



     const resetResultsAndQuestions = () => { 

         setResult(null); 

         setKeywords([]); 

         setRelatedQuestions([]); 

         setLastAnalysisInputType(null); 

     }; 



     // --- EVENT HANDLERS --- 

     const handleImageUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            
            // CHANGED: We now check the file type here.
            if (uploadedFile.type === "application/pdf") {
                setFileType('pdf');
            } else {
                setFileType('image');
            }

            setImage(uploadedFile);
            setPreviewUrl(URL.createObjectURL(uploadedFile));
            resetResultsAndQuestions();
        }
    };



     const handleClearImage = () => { 

         setImage(null); 

         setPreviewUrl(null); 

         resetResultsAndQuestions(); 

         const fileInput = document.getElementById('image-upload'); 

         if (fileInput) fileInput.value = ''; 

     }; 

      

     const handleTextPromptChange = (e) => { 

         setTextPrompt(e.target.value); 

     }; 



     // --- CORE AI FUNCTIONS --- 

     const analyzeImage = async (additionalContextForAI = "") => { 

         if (!image) return; 



         setLoading(true); 

         resetResultsAndQuestions(); 



         const apiKey = "AIzaSyAdWicVu_wRRus9h6llyTp9cYL_2SUrmK8"; // It's better to use environment variables for this 

         const genAI = new GoogleGenerativeAI(apiKey); 

         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 



         try { 

             const imagePart = await fileToGenerativePart(image); 

              

             const fullPrompt = `Your task is to analyze the provided image. First, determine if the image is a construction blueprint, architectural drawing, or floor plan. 

             IF IT IS a blueprint or drawing, start your response with "Analysis:" and then perform a detailed analysis: check for potential measurement errors, recommend sustainable materials, and provide a price range in PHP for those materials. 

             IF IT IS NOT a blueprint or drawing, start your response with "Description:" and then simply describe the contents of the image in a few sentences. Do not mention that it is not a blueprint. 

             ${textPrompt.trim() ? `Also consider this specific user request: "${textPrompt.trim()}".` : ''} ${additionalContextForAI}`; 



             const geminiResult = await model.generateContent([fullPrompt, imagePart]); 

             const responseText = geminiResult.response.text().trim().replace(/```/g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/##/g, "").replace(/\n\s*\n/g, "\n"); 

              

             setResult(responseText); 

             setLastAnalysisInputType('image');  

             generateKeywords(responseText); 



             // This logic is now smarter 

             if (responseText.trim().startsWith("Analysis:")) { 

                 await generateRelatedQuestions(responseText, 'blueprint_analysis'); 

             } else { 

                 await generateRelatedQuestions(responseText, 'image_description'); 

             } 



         } catch (error) { 

             console.error("Error during blueprint analysis:", error); 

             setResult(`Error during blueprint analysis: ${error?.message}`); 

         } finally { 

             setLoading(false); 

         } 

     }; 

      

     const analyzeTextPrompt = async (additionalContextForAI = "") => { 

         if (!textPrompt.trim()) return; 



         setLoading(true); 

         resetResultsAndQuestions(); 

         handleClearImage(); 



         const apiKey = "AIzaSyAdWicVu_wRRus9h6llyTp9cYL_2SUrmK8"; 

         const genAI = new GoogleGenerativeAI(apiKey); 

         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 



         try { 

             const prompt = `As a construction and architectural expert, provide a concise recommendation or answer based on the following user query about construction. Focus on practical advice, sustainable practices, or cost-effectiveness. If the query is unclear or irrelevant to construction, politely ask for clarification. 

             User Query: "${textPrompt.trim()}" ${additionalContextForAI}`; 



             const geminiResult = await model.generateContent([prompt]); 

             const responseText = geminiResult.response.text().trim().replace(/```/g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/##/g, "").replace(/\n\s*\n/g, "\n"); 



             setResult(responseText); 

             setLastAnalysisInputType('text'); 

             generateKeywords(responseText); 

             await generateRelatedQuestions(responseText, 'text_query'); 



         } catch (error) { 

             console.error('Error during text analysis:', error); 

             setResult(`Error during text analysis: ${error?.message}`); 

         } finally { 

             setLoading(false); 

         } 

     }; 

      

     const generateKeywords = (text) => { 

         const words = text.split(/\s+/); 

         const keywordsSet = new Set(); 

         words.forEach((word) => { 

             if (word.length > 4 && !["this", "that", "which", "from", "have"].includes(word.toLowerCase())) { 

                 keywordsSet.add(word.replace(/[.,:;]/g, '')); 

             } 

         }); 

         setKeywords(Array.from(keywordsSet).slice(0, 5)); 

     }; 



     const generateRelatedQuestions = async (responseText, type) => { 

         const apiKey = "AIzaSyAdWicVu_wRRus9h6llyTp9cYL_2SUrmK8"; 

         const genAI = new GoogleGenerativeAI(apiKey); 

         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

         let questionPrompt = ''; 



         // --- NEW: This function is now smarter with more conditions --- 

         if (type === 'blueprint_analysis') { 

             questionPrompt = `Based on the following blueprint analysis, generate 3 related questions an engineer might ask to learn more about budget, materials, or potential issues.`; 

         } else if (type === 'image_description') { 

             questionPrompt = `Based on the following image description, generate 3 curious and insightful follow-up questions someone might ask to get more details about the image or its context.`; 

         } else { // type === 'text_query' 

             questionPrompt = `Based on the following construction advice, generate 3 follow-up questions someone might ask for more detail about practical applications, budget, or sustainability.`; 

         } 



         try { 

             const geminiResult = await model.generateContent([ 

                 `${questionPrompt}\n\nOriginal Context: "${responseText}"\n\nGenerate the questions as a simple list, one per line.` 

             ]); 

             const questions = geminiResult.response.text().trim().split("\n").filter(q => q.trim() !== "" && q.length > 5); 

             setRelatedQuestions(questions); 

         } catch (error) { 

             console.error("Error generating related questions:", error); 

             setRelatedQuestions([]); 

         } 

     }; 



     const askRelatedQuestion = (question) => { 

         const fullQuestionPrompt = `Regarding the previous topic, please answer this specific question: "${question}".`; 

          

         if (lastAnalysisInputType === 'text') { 

             setTextPrompt(question); 

             analyzeTextPrompt(fullQuestionPrompt); 

         } else if (lastAnalysisInputType === 'image') { 

             setTextPrompt(question); 

             analyzeImage(fullQuestionPrompt); 

         } 

     }; 



     const regenerateContent = (keyword) => { 

         if (!image) return; 

         setTextPrompt(`Tell me more about '${keyword}' in relation to this blueprint.`); 

         analyzeImage(`Focus the analysis specifically on '${keyword}'.`); 

     }; 

      

     // --- DYNAMIC BUTTON LOGIC --- 

     const handleMainAnalyzeButtonClick = () => { 

         if (image) { 

             analyzeImage(); 

         } else if (textPrompt.trim()) { 

             analyzeTextPrompt(); 

         } 

     }; 



     const getButtonText = () => { 

         if (loading) return "Analyzing..."; 

         if (image && textPrompt.trim()) return "Analyze Blueprint & Question"; 

         if (image) return "Analyze Blueprint"; 

         if (textPrompt.trim()) return "Get Construction Advice"; 

         return "Start Analysis"; 

     }; 



     const isButtonDisabled = (!image && !textPrompt.trim()) || loading; 



     return ( 

         <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'> 

             <div className='bg-white rounded-lg shadow-xl overflow-hidden'> 

                 <div className='p-8'> 

                     <h2 className='text-3xl font-extrabold text-gray-900 mb-8 text-center'> 

                         Construction AI Assistant 

                     </h2> 



                     <div className='mb-8'> 

                         <label htmlFor="image-upload" className='block text-lg font-medium text-gray-700 mb-2'> 

                             1. Upload a blueprint file for analysis  

                         </label> 

                         <input 

                             type="file" 

                             id='image-upload' 

                             accept=".png,.jpeg,.jpg,.pdf" 

                             onChange={handleImageUpload} 

                             className='block w-full text-sm to-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition' 

                             disabled={loading} 

                         /> 

                     </div> 



                     {previewUrl && (
                        <div className='mb-8 flex flex-col items-center relative'>
                            <button
                                type="button"
                                onClick={handleClearImage}
                                className='absolute -top-3 -right-3 bg-red-500 text-white rounded-full px-3 py-1 text-xs font-semibold shadow-md hover:bg-red-600 transition'
                                aria-label="Clear image"
                            >
                                Clear
                            </button>

                            {/* Conditionally render the correct preview based on file type */}
                            {fileType === 'pdf' ? (
                                <div className="w-full mt-2 p-4 border-2 border-gray-200 border-dashed rounded-lg flex items-center space-x-4 bg-gray-50">
                                    <FileText className="h-10 w-10 text-blue-600 flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-medium text-gray-900 truncate" title={image.name}>
                                            {image.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatFileSize(image.size)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Uploaded Blueprint"
                                    className='rounded-lg shadow-md'
                                    style={{ objectFit: 'contain', maxHeight: '300px', width: 'auto' }}
                                />
                            )}
                        </div>
                    )}



                     <div className='text-center text-gray-500 text-sm my-8'> 

                         — AND/OR — 

                     </div> 



                     <div className='mb-8'> 

                         <label htmlFor="text-input" className='block text-lg font-medium text-gray-700 mb-2'> 

                             2. Provide additional details or ask a question 

                         </label> 

                         <textarea 

                             id="text-input" 

                             rows={4} 

                             className='block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500' 

                             placeholder="e.g., 'What are the best insulation materials for a tropical climate?' or 'Check the dimensions for the master bedroom on this blueprint.'" 

                             value={textPrompt} 

                             onChange={handleTextPromptChange} 

                             disabled={loading} 

                         ></textarea> 

                     </div> 



                     <button 

                         type="button" 

                         onClick={handleMainAnalyzeButtonClick} 

                         disabled={isButtonDisabled} 

                         className='w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg' 

                     > 

                         {getButtonText()} 

                     </button> 
<div className='text-center text-gray-500 text-sm my-5'> 

                        Enguinity can make mistakes, so double-check it

                     </div> 
                 </div> 



                 {(loading || result) && ( 

                     <div className='bg-blue-50 p-8 mt-8 rounded-lg border-t'> 

                         {loading && <p className="text-center text-blue-700 animate-pulse">Analyzing, please wait...</p>} 

                         {result && ( 

                             <> 

                                 <h3 className='text-2xl font-bold text-blue-800 mb-4'>Recommendation</h3> 

                                 <div className='space-y-2'> 

                                     {result.split("\n").map((line, idx) => line.trim() && ( 

                                         line.match(/^\d+\./) || line.startsWith("-") ? 

                                         <li key={idx} className='ml-4 text-gray-700'>{line}</li> : 

                                         <p key={idx} className='text-gray-800'>{line}</p> 

                                     ))} 

                                 </div> 

                                  

                                 



                                 {relatedQuestions.length > 0 && ( 

                                     <div className='mt-6'> 

                                         <h4 className='text-lg font-semibold mb-2 text-blue-700'>Related Questions</h4> 

                                         <ul className='space-y-2'> 

                                             {relatedQuestions.map((question, index) => ( 

                                                 <li key={index}> 

                                                     <button type='button' onClick={() => askRelatedQuestion(question)} className='text-left w-full bg-blue-200 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-300'> 

                                                         {question.replace(/^\d+\.\s*/, '')} 

                                                     </button> 

                                                 </li> 

                                             ))} 

                                         </ul> 

                                     </div> 

                                 )} 

                             </> 

                         )} 

                     </div> 

                 )} 

             </div> 

              

             <section className="mt-16"> 

                 <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2> 

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8"> 

                     {["Upload Image", "AI Analysis", "Get Results"].map((step, idx) => ( 

                         <div key={idx} className="bg-white p-6 rounded-lg shadow-md text-center hover:scale-105 transform transition"> 

                             <div className="text-3xl font-bold text-blue-600 mb-4">{idx + 1}</div> 

                             <h3 className="text-xl font-semibold mb-2">{step}</h3> 

                             <p className="text-gray-600">Our AI analyzes your blueprint and provides recommendations quickly.</p> 

                         </div> 

                     ))} 

                 </div> 

             </section> 

         </main> 

     ); 

 }; 



 export default BlueprintPage;