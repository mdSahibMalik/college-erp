import nodeMailer from "nodemailer";

export const sendMail = async ({email, subject, message}) => {
  try {
    console.log(email, subject, message)
    const transporter = nodeMailer.createTransport({
      host: process.env.SMTP_HOST,
      service: process.env.SMTP_SERVICE,
      port: process.env.SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSOWORD,
      },
    });

    const option = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: subject,
      html: message,
    };
    await transporter.sendMail(option);
    console.log('mail sent successfullyy....')
  } catch (error) {
    console.log(error)
   return "something went wrong";
  }
};
