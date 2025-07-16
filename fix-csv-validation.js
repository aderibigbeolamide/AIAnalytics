// This file contains the fixed CSV validation logic
function validateCsvMember(member, registration) {
  // Support multiple possible field names for CSV data
  const csvName = member.name || member.Fullname || member.fullName || member.fullname;
  const csvFirstName = member.FirstName || member.firstName || member.first_name;
  const csvLastName = member.LastName || member.lastName || member.last_name;
  const csvEmail = member.email || member.Email || member.emailAddress;
  const csvChanda = member.chandaNumber || member.ChandaNO || member.chandaNo || member.chanda_number;
  
  // Construct full name from first and last name if available
  let constructedName = '';
  if (csvFirstName && csvLastName) {
    constructedName = `${csvFirstName} ${csvLastName}`;
  } else if (csvFirstName) {
    constructedName = csvFirstName;
  } else if (csvLastName) {
    constructedName = csvLastName;
  }
  
  const finalCsvName = csvName || constructedName;
  
  // Compare name (case insensitive)
  const nameMatch = finalCsvName && registration.guestName && 
    finalCsvName.toLowerCase().trim() === registration.guestName.toLowerCase().trim();
  
  // Compare email (case insensitive)
  const emailMatch = csvEmail && registration.guestEmail && 
    csvEmail.toLowerCase().trim() === registration.guestEmail.toLowerCase().trim();
  
  console.log(`CSV Validation Check:
    CSV Member: ${finalCsvName} | ${csvEmail} | ${csvChanda}
    Registration: ${registration.guestName} | ${registration.guestEmail} | 
    Matches: name=${nameMatch}, email=${emailMatch}`);
  
  return nameMatch || emailMatch;
}

module.exports = { validateCsvMember };