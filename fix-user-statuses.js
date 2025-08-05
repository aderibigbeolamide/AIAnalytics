// Direct API calls to fix user statuses based on organization statuses
async function fixUserStatuses() {
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'superadmin',
      password: 'superadmin2025!'
    })
  });
  
  const { token } = await loginResponse.json();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('Getting users and organizations...');
  
  // Get users and organizations
  const [usersResponse, orgsResponse] = await Promise.all([
    fetch('http://localhost:5000/api/super-admin/users', { headers }),
    fetch('http://localhost:5000/api/super-admin/organizations', { headers })
  ]);
  
  const { users } = await usersResponse.json();
  const { organizations } = await orgsResponse.json();
  
  console.log(`Found ${users.length} users and ${organizations.length} organizations`);
  
  // Create organization lookup map
  const orgMap = {};
  organizations.forEach(org => {
    orgMap[org.id] = org;
  });
  
  // Fix user statuses
  for (const user of users) {
    if (user.status === 'pending_approval' && user.organizationId) {
      const org = orgMap[user.organizationId];
      if (org) {
        let newStatus = user.status;
        
        if (org.status === 'approved') {
          newStatus = 'active';
        } else if (org.status === 'rejected') {
          newStatus = 'suspended';
        }
        
        if (newStatus !== user.status) {
          console.log(`Updating user ${user.username} from ${user.status} to ${newStatus} (org: ${org.name} - ${org.status})`);
          
          // Update user status via API
          const updateResponse = await fetch(`http://localhost:5000/api/super-admin/users/${user.id}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status: newStatus })
          });
          
          if (updateResponse.ok) {
            console.log(`✓ Updated ${user.username}`);
          } else {
            console.log(`✗ Failed to update ${user.username}`);
          }
        }
      }
    }
  }
  
  console.log('User status synchronization complete!');
}

fixUserStatuses().catch(console.error);