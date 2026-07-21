import transporter from "../Config/nodemailer.js";

export async function sendMail({ to, subject, html, text = "" }) {
  try {
    return transporter.sendMail({
      from: `"Codrr Drive" <${process.env.MAIL_FROM}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.log(error.message);
  }
}
