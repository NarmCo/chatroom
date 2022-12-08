// import { Express } from 'express';
// import client_verify_log_histories_message from '../middlewares/client_verify_log_histories_message';
// import { err } from 'never-catch';
// import { FEATURES } from '../../utils/features';
// import { UploadedFile } from 'express-fileupload';
//
// const FileRoute = '/file';
//
// const file = (app: Express) => {
//     app.post(
//         FileRoute,
//         client_verify_log_histories_message(
//             FileRoute + ':upload',
//             async (req, _res, connection) => {
//                 if (req.files === undefined || req.files === null){
//                     return err({
//                         feature: FEATURES.File,
//                         code: 100
//                     })
//                 }
//
//                 const a = req.files.avatar as UploadedFile;
//
//             }
//         )
//     )
// }

const a = 1;
export default a;