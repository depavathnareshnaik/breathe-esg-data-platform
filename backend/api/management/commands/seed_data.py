from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from api.models import Tenant, UserProfile

class Command(BaseCommand):
    help = 'Seeds default tenants and user accounts for validation and demo.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding data...")
        
        # 1. Create Tenants
        aerohi, _ = Tenant.objects.get_or_create(name="Aerohi Enterprise")
        alpha, _ = Tenant.objects.get_or_create(name="Alpha Logistics")
        self.stdout.write(f"Tenants created: {aerohi.name}, {alpha.name}")
        
        # 2. Define user credentials
        users_data = [
            {
                'username': 'analyst_aerohi',
                'email': 'analyst@aerohi.com',
                'password': 'Password123!',
                'role': 'ANALYST',
                'tenant': aerohi,
                'is_staff': False
            },
            {
                'username': 'admin_aerohi',
                'email': 'admin@aerohi.com',
                'password': 'Password123!',
                'role': 'ADMIN',
                'tenant': aerohi,
                'is_staff': True
            },
            {
                'username': 'analyst_alpha',
                'email': 'analyst@alpha.com',
                'password': 'Password123!',
                'role': 'ANALYST',
                'tenant': alpha,
                'is_staff': False
            }
        ]
        
        for u_info in users_data:
            # Check or create user
            user, created = User.objects.get_or_create(
                username=u_info['username'],
                email=u_info['email']
            )
            if created:
                user.set_password(u_info['password'])
                user.is_staff = u_info['is_staff']
                user.save()
            
            # Create or update profile
            profile, _ = UserProfile.objects.get_or_create(user=user, defaults={
                'tenant': u_info['tenant'],
                'role': u_info['role']
            })
            profile.tenant = u_info['tenant']
            profile.role = u_info['role']
            profile.save()
            
            # Ensure Auth Token exists
            token, _ = Token.objects.get_or_create(user=user)
            
            self.stdout.write(f"User {user.username} ({profile.role}) - Token: {token.key}")
            
        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
