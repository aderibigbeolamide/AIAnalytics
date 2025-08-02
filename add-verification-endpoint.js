// Direct database operation using the existing connection
const { EventRegistration } = require('./shared/mongoose-schema.js');

async function addVerificationCode() {
  try {
    const result = await EventRegistration.updateOne(
      { uniqueId: 'MEMBER_1754175181834_R7O2JX' },
      { 
        $set: { 
          'registrationData.manualVerificationCode': '123456'
        }
      }
    );
    
    console.log('Update result:', result);
    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

module.exports = { addVerificationCode };
