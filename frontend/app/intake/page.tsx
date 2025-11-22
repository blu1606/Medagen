import { PatientIntakeForm } from '@/components/organisms/PatientIntakeForm';
import { FormLayout } from '@/components/templates/FormLayout';

export default function IntakePage() {
    return (
        <FormLayout
            title="Patient Intake Form"
            description="Please provide your information so our AI assistant can help you."
        >
            <PatientIntakeForm />
        </FormLayout>
    );
}
